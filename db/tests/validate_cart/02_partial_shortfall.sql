-- 02_partial_shortfall.sql
-- Product has inventory 2; request 5 should produce a shortfall and adjusted quantity 2
BEGIN;

INSERT INTO public.products (sku, inventory, reserved_count)
VALUES ('SKU-B', 2, 0)
ON CONFLICT (sku) DO UPDATE
  SET inventory = EXCLUDED.inventory,
      reserved_count = EXCLUDED.reserved_count;

SELECT public.validate_cart('[{"sku":"SKU-B","quantity":5}]'::jsonb, NULL) AS result;

ROLLBACK;

-- Expected: valid = false, errors contains an entry with requested=5 available=2
-- adjusted_items contains SKU-B with adjusted_quantity 2
