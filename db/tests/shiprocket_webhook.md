## Shiprocket webhook manual test

1. Configure a `SHIPROCKET_WEBHOOK_SECRET` in `store_settings` (encrypted via existing tools) or set env used by your decryption.

2. Example curl to POST a delivered event (replace signature header with computed HMAC):

```bash
BODY='{"order_id":"11111111-1111-1111-1111-111111111111","status":"delivered","awb":"AWB123","shiprocket_order_id":"SR123"}'
# compute HMAC using your secret; for manual testing you can skip verification by inserting secret value
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-signature: <computed-hmac>" \
  --data "$BODY" \
  https://your-host/_next/data/.../api/webhooks/shiprocket
```

3. Expected DB effects:

- `orders` row with id `11111111-1111-1111-1111-111111111111` updated with `fulfillment_status = 'delivered'` and `status = 'delivered'` (if transition allowed).
- `shiprocket_webhook_logs` should contain the event JSON and `awb_code` / `shiprocket_order_id` fields.

Check logs:

```sql
SELECT * FROM public.shiprocket_webhook_logs ORDER BY processed_at DESC LIMIT 5;
SELECT id, status, fulfillment_status, external_tracking_code FROM public.orders WHERE id = '11111111-1111-1111-1111-111111111111';
```
