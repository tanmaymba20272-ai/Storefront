import { NextResponse } from 'next/server'
import { getServerSupabase } from '../../../lib/supabaseClient'
import getRazorpayKeys from '../../../lib/utils/getRazorpayKeys'
import Razorpay from 'razorpay'
import { randomUUID } from 'crypto'

type CartItem = { sku: string; quantity: number }

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const cart_items: CartItem[] = body.cart_items
    const shipping_address = body.shipping_address

    if (!Array.isArray(cart_items) || cart_items.length === 0) {
      return NextResponse.json({ error: 'INVALID_CART' }, { status: 400 })
    }

    const supabase = getServerSupabase()

    // Get current user (server-side). Require authenticated user for now.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.id) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const orderId = randomUUID()

    // Reserve inventory via RPC
    const rpcRes = await supabase.rpc('reserve_inventory', { cart_items, order_id: orderId })
    if (rpcRes.error) {
      return NextResponse.json({ error: 'RESERVE_FAILED', detail: rpcRes.error.message }, { status: 500 })
    }

    // rpcRes.data may be returned as a raw object or an array depending on driver
    type ReserveResult = { success: boolean; error?: string; sku?: string }
    let rpcData: ReserveResult | null = null
    const rawRpc = rpcRes.data as ReserveResult | ReserveResult[] | null
    if (Array.isArray(rawRpc) && rawRpc.length > 0) rpcData = rawRpc[0]
    else if (rawRpc && !Array.isArray(rawRpc)) rpcData = rawRpc
    if (rpcData && rpcData.success === false) {
      if (rpcData.error === 'INVENTORY_EXHAUSTED') {
        return NextResponse.json({ error: 'INVENTORY_EXHAUSTED', sku: rpcData.sku }, { status: 409 })
      }
      return NextResponse.json({ error: rpcData.error || 'RESERVE_FAILED' }, { status: 400 })
    }

    // Calculate total amount by fetching products by SKU
    const skus = Array.from(new Set(cart_items.map((c) => c.sku)))
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id,sku,price_cents,currency')
      .in('sku', skus)

    if (prodErr || !products) {
      // Cleanup reservation
      try { await supabase.rpc('release_reservation', { p_order_id: orderId }) } catch { /* ignore */ }
      return NextResponse.json({ error: 'PRODUCT_LOOKUP_FAILED' }, { status: 500 })
    }

    const priceMap = new Map<string, { id: string; price_cents: number; currency: string }>()
    for (const p of (products as Array<{ id: string; sku: string; price_cents: number; currency: string }>)) {
      priceMap.set(p.sku, { id: p.id, price_cents: p.price_cents, currency: p.currency })
    }

    let amount_paise = 0
    let currency = 'INR'
    for (const item of cart_items) {
      const entry = priceMap.get(item.sku)
      if (!entry) {
        try { await supabase.rpc('release_reservation', { p_order_id: orderId }) } catch { /* ignore */ }
        return NextResponse.json({ error: 'SKU_NOT_FOUND', sku: item.sku }, { status: 400 })
      }
      amount_paise += Number(entry.price_cents) * Number(item.quantity)
      currency = entry.currency || currency
    }

    // Create Razorpay order
    type RazorpayOrderResult = { id: string; amount: number; currency: string; receipt?: string | null }
    let razorpayOrder: RazorpayOrderResult | null = null
    try {
      const { keyId, keySecret } = await getRazorpayKeys()
      if (!keyId || !keySecret) {
        try { await supabase.rpc('release_reservation', { p_order_id: orderId }) } catch { /* ignore */ }
        return NextResponse.json({ error: 'RAZORPAY_CONFIG_MISSING' }, { status: 500 })
      }
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })

      razorpayOrder = await razorpay.orders.create({
        amount: amount_paise,
        currency: currency || 'INR',
        receipt: orderId,
      })

      if (!razorpayOrder || !razorpayOrder.id) {
        throw new Error('RAZORPAY_RESPONSE_INVALID')
      }

      // Insert order record
      const { error: insertErr } = await supabase.from('orders').insert([
        {
          id: orderId,
          user_id: user.id,
          razorpay_order_id: razorpayOrder.id,
          status: 'pending',
          amount_paise: amount_paise,
          currency: currency || 'INR',
          items: cart_items,
          shipping_address,
        },
      ])

      if (insertErr) {
        // If DB insert failed, roll back reservation
        try { await supabase.rpc('release_reservation', { p_order_id: orderId }) } catch { /* ignore */ }
        return NextResponse.json({ error: 'ORDER_INSERT_FAILED' }, { status: 500 })
      }

      return NextResponse.json(
        {
          razorpay_order_id: razorpayOrder.id,
          razorpay_key_id: keyId,
          amount_paise,
          currency,
        },
        { status: 200 }
      )
    } catch (err: unknown) {
      // Cleanup reservation
      try { await supabase.rpc('release_reservation', { p_order_id: orderId }) } catch { /* ignore */ }
      return NextResponse.json({ error: 'RAZORPAY_ORDER_FAILED' }, { status: 502 })
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: 'UNKNOWN_ERROR' }, { status: 500 })
  }
}
