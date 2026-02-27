import { getServerSupabase } from '../../../../../../lib/supabaseClient'
import getShiprocketToken from '../../../../../../lib/utils/getShiprocketToken'

export const runtime = 'nodejs'
export const revalidate = 0

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = getServerSupabase()

  // Admin enforcement: ensure the caller is an admin user server-side
  // getUser() re-validates with the auth server on every request; getSession() does not.
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user?.id) {
    return new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403, headers: { 'content-type': 'application/json' } })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403, headers: { 'content-type': 'application/json' } })
  }

  if (!UUID_RE.test(id)) {
    return new Response(JSON.stringify({ error: 'INVALID_ID' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, items, shipping_address, amount_paise, currency, fulfillment_status, shiprocket_order_id, shipment_id, awb_code, courier_name, label_url')
    .eq('id', id)
    .single()

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: 'ORDER_NOT_FOUND' }), { status: 404, headers: { 'content-type': 'application/json' } })
  }

  if (order.fulfillment_status && order.fulfillment_status !== 'unfulfilled') {
    // Idempotent: return existing fulfillment details
    const payload = {
      shiprocket_order_id: order.shiprocket_order_id ?? null,
      shipment_id: order.shipment_id ?? null,
      awb_code: order.awb_code ?? null,
      courier_name: order.courier_name ?? null,
      label_url: order.label_url ?? null,
      fulfillment_status: order.fulfillment_status,
    }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  // Begin Shiprocket flow
  try {
    const { token } = await getShiprocketToken()

    // Simplified mapping: convert internal `items` and `shipping_address` to Shiprocket adhoc payload.
    // Important: do not send internal-only fields (cost_price, internal_notes, etc.).
    const mappedItems = (order.items || []).map((it: any) => ({
      name: it.name || it.sku || 'item',
      sku: it.sku || undefined,
      units: it.quantity ?? 1,
      selling_price: Math.round((it.price_cents ?? 0) / 100),
    }))

    const shipPayload = {
      order_id: id,
      order_date: new Date().toISOString(),
      billing_customer_name: order.shipping_address?.fullName || order.shipping_address?.name || 'Customer',
      billing_address: order.shipping_address?.line1 || order.shipping_address?.address || '',
      billing_city: order.shipping_address?.city || '',
      billing_pincode: order.shipping_address?.pincode || order.shipping_address?.postal_code || '',
      billing_state: order.shipping_address?.state || '',
      billing_country: order.shipping_address?.country || 'India',
      customer_email: order.shipping_address?.email || null,
      customer_phone: order.shipping_address?.phone || null,
      order_items: mappedItems,
      shipping_charges: 0,
      sub_total: Math.round((order.amount_paise ?? 0) / 100),
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5,
    }

    // Create manifest / adhoc order
    const createRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(shipPayload),
    })

    const createJson = await createRes.json().catch(() => ({}))

    if (!createRes.ok) {
      const msg = (createJson && (createJson.message || createJson.error)) || JSON.stringify(createJson)
      const lowered = String(msg).toLowerCase()
      if (lowered.includes('pincode') || lowered.includes('service') || lowered.includes('serviceability')) {
        return new Response(JSON.stringify({ error: 'SERVICE_UNAVAILABLE', details: createJson }), { status: 400, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: 'SHIPROCKET_ERROR', details: createJson }), { status: 502, headers: { 'content-type': 'application/json' } })
    }

    // Extract ids (response shapes vary): try common paths
    const shiprocket_order_id = createJson?.response?.order_id || createJson?.data?.order_id || createJson?.order_id || createJson?.order?.id || null
    const shipment_id = createJson?.response?.shipment_id || createJson?.data?.shipment_id || createJson?.shipment_id || null

    // Persist shiprocket_order_id and shipment_id and mark manifested if available
    const updates: any = { fulfillment_status: 'manifested' }
    if (shiprocket_order_id) updates.shiprocket_order_id = shiprocket_order_id
    if (shipment_id) updates.shipment_id = shipment_id

    await supabase.from('orders').update(updates).eq('id', id)

    // Assign AWB (if we have a shipment_id)
    let awb_code: string | null = null
    let courier_name: string | null = null

    if (shipment_id) {
      const awbRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment_id }),
      })

      const awbJson = await awbRes.json().catch(() => ({}))
      if (!awbRes.ok) {
        return new Response(JSON.stringify({ error: 'SHIPROCKET_ERROR', details: awbJson }), { status: 502, headers: { 'content-type': 'application/json' } })
      }

      awb_code = awbJson?.data?.awb || awbJson?.awb || awbJson?.response?.awb_code || null
      courier_name = awbJson?.data?.courier_name || awbJson?.courier_name || awbJson?.response?.courier || null

      await supabase.from('orders').update({ awb_code, courier_name }).eq('id', id)
    }

    // Fetch label (may return URL or base64). If base64 is returned, we store a placeholder and
    // recommend persisting to storage (S3/Supabase Storage) in production.
    let label_url: string | null = null
    if (shipment_id) {
      const labelRes = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${encodeURIComponent(String(shipment_id))}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      const labelJson = await labelRes.json().catch(() => ({}))

      if (!labelRes.ok) {
        // non-critical: return Shiprocket error
        return new Response(JSON.stringify({ error: 'SHIPROCKET_ERROR', details: labelJson }), { status: 502, headers: { 'content-type': 'application/json' } })
      }

      // Common shapes: { data: { label_url } } or { label: '<base64>' }
      label_url = labelJson?.data?.label_url || labelJson?.label_url || null
      const labelBase64 = labelJson?.label || labelJson?.data?.label_base64 || null

      if (!label_url && labelBase64) {
        // Persisting base64 to DB directly is not recommended for large binary content.
        // For now, store a placeholder reference; recommend uploading to storage and
        // saving the storage URL in `label_url`.
        label_url = `data:application/pdf;base64,${String(labelBase64).slice(0, 64)}...` // truncated placeholder
      }

      await supabase.from('orders').update({ label_url }).eq('id', id)
    }

    return new Response(JSON.stringify({ shiprocket_order_id, shipment_id, awb_code, courier_name, label_url }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return new Response(JSON.stringify({ error: 'SHIPROCKET_ERROR', details: message }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}

export default POST
