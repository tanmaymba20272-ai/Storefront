## Inventory TTL manual test

1. Insert a pending order created 20 minutes ago with items reserving product counts.

```sql
-- create a product and set reserved_count
INSERT INTO public.products (id, name, slug, price_cents, currency, reserved_count) VALUES ('11111111-1111-1111-1111-111111111111','TTL Test','ttl-test',1000,'USD',2);

-- insert a pending order with items JSON referencing the product
INSERT INTO public.orders (id, user_id, status, items, created_at)
VALUES ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','pending',
  '[{"product_id":"11111111-1111-1111-1111-111111111111","quantity":2}]'::jsonb,
  now() - interval '20 minutes');

-- wait for cron job (or run the function manually):
SELECT public.inventory_ttl_release();

-- verify order status changed and reserved_count decremented
SELECT status FROM public.orders WHERE id = '22222222-2222-2222-2222-222222222222';
SELECT reserved_count FROM public.products WHERE id = '11111111-1111-1111-1111-111111111111';

-- verify audit row
SELECT * FROM public.inventory_audit ORDER BY created_at DESC LIMIT 5;
```

Expected: order status is 'abandoned'; product reserved_count reduced by 2 (or to 0); audit row created.
