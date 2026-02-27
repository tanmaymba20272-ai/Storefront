-- 01_reserve_success.sql
-- Setup: ensure a product exists with inventory 5 and reserved_count 0

BEGIN;

INSERT INTO public.products (id, sku, name, price_cents, currency, inventory, reserved_count, created_at)
VALUES (gen_random_uuid(), 'TEST-SKU-RESERVE-1', 'Reserve Test Product', 10000, 'INR', 5, 0, now())
ON CONFLICT (sku) DO UPDATE SET inventory = 5, reserved_count = 0;

-- Reserve 2 units
SELECT public.reserve_inventory('[{"sku":"TEST-SKU-RESERVE-1","quantity":2}]'::jsonb, gen_random_uuid()::uuid) as res;

-- Verify reservation row exists and reserved_count updated
SELECT p.sku, p.inventory, p.reserved_count, r.quantity
FROM public.products p
JOIN public.inventory_reservations r ON r.product_id = p.id
WHERE p.sku = 'TEST-SKU-RESERVE-1';

ROLLBACK;

-- Expected: reserve_inventory returns success true; reserved_count incremented by 2 and a reservation row inserted.
