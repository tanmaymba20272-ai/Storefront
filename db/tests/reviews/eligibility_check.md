# Reviews Eligibility Check — Manual Test Guide

This guide describes how to seed an order and verify the `/api/reviews/verify-eligibility` endpoint using `psql` and `curl`.

Preconditions:
- You have a test user with `id = '<TEST_USER_UUID>'` and a matching Auth session cookie or service role for seeding.
- Replace placeholders in the commands below with real UUIDs and keys.

1) Seed an order in `psql` (as the service_role or DB owner):

```sql
INSERT INTO orders (id, user_id, status, items, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '<TEST_USER_UUID>'::uuid,
  'paid',
  '[{"product_id":"<PRODUCT_UUID>", "quantity":1}]'::jsonb,
  now()
);
```

2) Obtain an authenticated session cookie (or use `supabase auth session` helpers).

3) Call the eligibility endpoint (replace `<HOST>` and cookie):

```bash
curl -X GET "https://<HOST>/api/reviews/verify-eligibility?product_id=<PRODUCT_UUID>" \
  -H "Cookie: supabase-auth-token=<YOUR_AUTH_COOKIE>"
```

Expected response:

```json
{ "eligible": true }
```

4) Negative test: call with a different product UUID not present in `orders.items`. Expect `{ "eligible": false }`.

Notes:
- If you are testing locally, use the Supabase CLI to create a test user and use the service role key to seed the `orders` table.
- The `items` JSONB structure must match the containment check used by the endpoint (array of objects with `product_id`).
