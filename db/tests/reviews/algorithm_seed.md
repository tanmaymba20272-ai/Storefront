# Reviews Ordering Algorithm — Seed & Verification Steps

This guide helps you insert sample reviews and verify the `get_product_reviews` ordering tiers.

1) Insert sample reviews (run as service_role / DB owner):

```sql
-- Clear sample rows if present
DELETE FROM reviews WHERE product_id = '<PRODUCT_UUID>'::uuid;

INSERT INTO reviews (id, product_id, user_id, rating, body, media_urls, helpful_count, verified_purchase, created_at)
VALUES
  ('r1-1111-1111-1111-111111111111'::uuid, '<PRODUCT_UUID>'::uuid, 'u1-1111-1111-1111-111111111111'::uuid, 5, 'Great product with photo', ARRAY['https://cdn.example/review1.jpg'], 10, true, now() - interval '1 day'),
  ('r2-2222-2222-2222-222222222222'::uuid, '<PRODUCT_UUID>'::uuid, 'u2-2222-2222-2222-222222222222'::uuid, 4, 'Nice, with photo', ARRAY['https://cdn.example/review2.jpg'], 5, true, now() - interval '2 days'),
  ('r3-3333-3333-3333-333333333333'::uuid, '<PRODUCT_UUID>'::uuid, 'u3-3333-3333-3333-333333333333'::uuid, 5, 'Excellent no photo', NULL, 7, true, now() - interval '3 days'),
  ('r4-4444-4444-4444-444444444444'::uuid, '<PRODUCT_UUID>'::uuid, 'u4-4444-4444-4444-444444444444'::uuid, 3, 'Okay', NULL, 1, false, now() - interval '4 days');
```

2) Call the RPC to verify ordering:

```sql
SELECT * FROM public.get_product_reviews('<PRODUCT_UUID>'::uuid, 10, 0);
```

3) Expected ordering (by tier → helpful_count → created_at):

- r1 (5 stars w/ photo)
- r2 (4 stars w/ photo)
- r3 (5 stars no photo)
- r4 (other)

4) Adjust `helpful_count` values to test secondary ordering within the same tier.

Notes:
- Replace `<PRODUCT_UUID>` with a real UUID for your product. Use the service role to insert rows to avoid RLS blocking the seeds.
- If the RPC returns fewer fields than expected, check the function's `RETURNS TABLE(...)` signature and adjust as needed.
