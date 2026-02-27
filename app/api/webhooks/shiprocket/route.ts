export const runtime = 'nodejs';

import { getServerSupabase } from '../../../../lib/supabaseClient';
import { decryptSettings } from '../../../../lib/encryption';
import type { NextRequest } from 'next/server';

import crypto from 'crypto';

async function getWebhookSecret(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'SHIPROCKET_WEBHOOK_SECRET')
    .single();
  if (error || !data?.value) return null;
  try {
    const s = await decryptSettings(data.value);
    return s;
  } catch (_e) {
    return null;
  }
}

export async function POST(req: Request) {
  const supabase = getServerSupabase();

  const buf = await req.arrayBuffer();
  const raw = Buffer.from(buf);

  const headerSig = (req.headers.get('x-shiprocket-signature') || '') as string;

  const secret = await getWebhookSecret(supabase);
  if (!secret) {
    // If secret missing, still accept but log for investigation
    console.warn('[shiprocket/webhook] missing webhook secret');
  } else {
    try {
      const h = crypto.createHmac('sha256', secret).update(raw).digest();
      const incoming = Buffer.from(headerSig, 'hex');
      if (incoming.length !== h.length || !crypto.timingSafeEqual(incoming, h)) {
        // signature mismatch
        console.warn('[shiprocket/webhook] signature mismatch');
        // respond 200 to avoid retries but do not process
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
    } catch (e) {
      console.warn('[shiprocket/webhook] signature verification error', e);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  }

  let body: any = null;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch (e) {
    // if unparseable, still log raw payload
    try {
      await supabase.from('shiprocket_webhook_logs').insert({ shiprocket_event: raw.toString('utf8') })
    } catch { /* ignore log failure */ }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Normalize fields
  const orderId = body?.order_id || body?.order?.id || null;
  const shiprocketOrderId = body?.shiprocket_order_id || body?.order?.order_id || body?.order_id || null;
  const awb = body?.awb || body?.awb_code || null;
  const status = (body?.status || body?.event || '') as string;

  // idempotent update: only transition if not already final
  try {
    if (orderId) {
      const { data: existing, error: exErr } = await supabase.from('orders').select('id, status, fulfillment_status').eq('id', orderId).limit(1).maybeSingle();
      if (!exErr && existing) {
        const currentFulfillment = existing.fulfillment_status || null;
        const isFinal = currentFulfillment === 'delivered' || currentFulfillment === 'cancelled';
        if (!isFinal) {
          if (/deliv/i.test(status)) {
            await supabase.from('orders').update({ fulfillment_status: 'delivered', status: 'delivered', external_tracking_code: awb, shiprocket_order_id: shiprocketOrderId }).eq('id', orderId);
          } else if (/cancel/i.test(status)) {
            await supabase.from('orders').update({ fulfillment_status: 'cancelled', status: 'cancelled', shiprocket_order_id: shiprocketOrderId }).eq('id', orderId);
          } else {
            // store awb/order id if present
            await supabase.from('orders').update({ external_tracking_code: awb, shiprocket_order_id: shiprocketOrderId }).eq('id', orderId);
          }
        }
      }
    }

    // persist webhook log
    try {
      await supabase.from('shiprocket_webhook_logs').insert({ shiprocket_event: body, order_id: orderId, shiprocket_order_id: shiprocketOrderId, awb_code: awb })
    } catch { /* ignore log failure */ }
  } catch (e) {
    console.error('[shiprocket/webhook] processing error', e);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
