import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabaseClient';
import getRazorpayKeys from '../../../../lib/utils/getRazorpayKeys';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(request: Request) {
  // Read raw body for signature verification
  const rawBody = await request.text();

  let webhookSecret: string | undefined;
  try {
    const keys = await getRazorpayKeys();
    webhookSecret = keys?.webhookSecret;
  } catch (err: unknown) {
    return new NextResponse(JSON.stringify({ error: 'unable_to_retrieve_webhook_secret' }), { status: 500 });
  }

  if (!webhookSecret) {
    return new NextResponse(JSON.stringify({ error: 'missing_webhook_secret' }), { status: 500 });
  }

  const sigHeader = request.headers.get('x-razorpay-signature');
  if (!sigHeader) {
    return new NextResponse(JSON.stringify({ error: 'missing_signature' }), { status: 400 });
  }

  try {
    const computed = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest();
    let received: Buffer | null = null;
    try {
      received = Buffer.from(sigHeader, 'hex');
    } catch (e) {
      // invalid header format
      return new NextResponse(JSON.stringify({ error: 'invalid_signature_format' }), { status: 400 });
    }

    if (!received || computed.length !== received.length || !crypto.timingSafeEqual(computed, received)) {
      return new NextResponse(JSON.stringify({ error: 'invalid_signature' }), { status: 400 });
    }
  } catch (err: unknown) {
    return new NextResponse(JSON.stringify({ error: 'signature_verification_failed' }), { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch (err: unknown) {
    return new NextResponse(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const supabase = getServerSupabase();

  try {
    const parsed = body as Record<string, any>;
    const event = parsed?.event;

    // Extract razorpay_order_id (paths differ by event type)
    const razorpayOrderId = parsed?.payload?.payment?.entity?.order_id || parsed?.payload?.order?.entity?.id;
    if (!razorpayOrderId) {
      return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
    }

    // Find corresponding order
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('id, status')
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle();

    if (orderErr) {
      return new NextResponse(JSON.stringify({ error: 'db_lookup_failed' }), { status: 500 });
    }

    if (!orderRow) {
      // No matching order — acknowledge so Razorpay won't retry
      return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
    }

    const orderId: string = orderRow.id;
    const status: string = orderRow.status;

    if ((event === 'order.paid' || event === 'payment.captured') && status !== 'paid') {
      // finalize inventory via RPC and mark order paid
      const { data: finData, error: finErr } = await supabase.rpc('finalize_inventory', { order_uuid: orderId });
      if (finErr) {
        return new NextResponse(JSON.stringify({ error: 'finalize_inventory_failed' }), { status: 500 });
      }

      const { error: updErr } = await supabase
        .from('orders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', orderId);

      if (updErr) {
        return new NextResponse(JSON.stringify({ error: 'update_order_failed' }), { status: 500 });
      }

      return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
    }

    if (event === 'payment.failed') {
      const { data: failData, error: failErr } = await supabase.rpc('fail_order', { order_uuid: orderId });
      if (failErr) {
        return new NextResponse(JSON.stringify({ error: 'fail_order_failed' }), { status: 500 });
      }
      return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
    }

    // Other events: acknowledge
    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: unknown) {
    return new NextResponse(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }
}
