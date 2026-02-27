-- 01_valid_cart.sql
-- Creates or updates a test product and calls validate_cart for a valid request.
BEGIN;

-- Ensure product exists for test. Adjust columns if your schema differs.
INSERT INTO public.products (sku, inventory, reserved_count)
VALUES ('SKU-A', 5, 0)
ON CONFLICT (sku) DO UPDATE
  SET inventory = EXCLUDED.inventory,
      reserved_count = EXCLUDED.reserved_count;

-- Run validation
SELECT public.validate_cart('[{"sku":"SKU-A","quantity":1}]'::jsonb, NULL) AS result;

ROLLBACK;

-- Expected: valid = true, errors = [], adjusted_items contains SKU-A with adjusted_quantity 1
