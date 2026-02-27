-- 02_idempotency.sql
-- Demonstrates idempotency expectations for webhook processing

-- 1) Insert a fake product and order pre-marked as paid
-- NOTE: adjust UUIDs to match your environment
BEGIN;

-- create a product
INSERT INTO public.products (id, name, price_cents, currency, inventory, reserved_count, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000010', 'Test Product', 1000, 'INR', 10, 0, now()
)
ON CONFLICT DO NOTHING;

-- create an order already marked as paid
INSERT INTO public.orders (id, razorpay_order_id, status, created_at)
VALUES (
  '00000000-0000-0000-0000-0000000000aa', 'order_TEST_IDEMP', 'paid', now()
)
ON CONFLICT DO NOTHING;

-- create a reservation (should not be finalized again by webhook handler because order.status = 'paid')
INSERT INTO public.inventory_reservations (id, order_id, product_id, quantity, created_at)
VALUES (
  gen_random_uuid(), '00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000010', 2, now()
);

COMMIT;

-- Check current product inventory and reserved_count
SELECT id, inventory, reserved_count FROM public.products WHERE id = '00000000-0000-0000-0000-000000000010';

-- Simulation instructions:
-- 1) Ensure an order with razorpay_order_id = 'order_TEST_IDEMP' exists and is status='paid'.
-- 2) POST the webhook payload to the /api/webhooks/razorpay endpoint with a valid signature.
-- 3) The webhook handler checks order status and will NOT call `finalize_inventory` for orders already marked 'paid'.

-- If you want to validate the application-level idempotency directly via DB:
-- - Change the order.status to 'pending'
-- - POST the webhook once (or call rpc finalize_inventory(order_id))
-- - Mark order as 'paid'
-- - Re-send webhook: the handler should detect status='paid' and NOT call finalize_inventory again.

-- Node.js snippet: simulate sending the same webhook twice (replace URL and set RAZORPAY_WEBHOOK_SECRET env var)
-- Save this as `send_webhook_twice.js` and run `RAZORPAY_WEBHOOK_SECRET=correct_secret node send_webhook_twice.js`

-- ```js
-- const https = require('https');
-- const crypto = require('crypto');
-- const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_TEST_IDEMP' } } } });
-- const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'correct_secret';
-- const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
-- const opts = url => new URL(url);
-- async function send(url) {
--   const u = opts(url);
--   const req = https.request(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': sig } }, res => {
--     let d = '';
--     res.on('data', c => d += c);
--     res.on('end', () => console.log('status', res.statusCode, d));
--   });
--   req.on('error', e => console.error(e));
--   req.write(payload);
--   req.end();
-- }
-- (async () => {
--   const url = process.env.WEBHOOK_URL || 'https://your-app.example.com/api/webhooks/razorpay';
--   console.log('sending first'); await send(url);
--   console.log('sending second'); await send(url);
-- })();
-- ```
