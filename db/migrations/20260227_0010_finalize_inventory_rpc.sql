-- Migration: finalize inventory and fail_order RPCs
-- Date: 2026-02-27
-- Notes: SECURITY DEFINER functions; change owner to the DB service role user after deployment

-- Add paid_at column to orders if not present
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;

-- Finalize inventory RPC
DROP FUNCTION IF EXISTS public.finalize_inventory(uuid);
CREATE OR REPLACE FUNCTION public.finalize_inventory(order_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  prod_id uuid;
BEGIN
  -- Process all reservations for the order in a single transaction
  FOR r IN
    SELECT id, product_id, quantity
    FROM public.inventory_reservations
    WHERE order_id = order_uuid
    FOR UPDATE
  LOOP
    -- Lock the product row, subtract inventory and reserved_count safely
    UPDATE public.products p
    SET
      inventory = GREATEST(p.inventory - r.quantity, 0),
      reserved_count = GREATEST(p.reserved_count - r.quantity, 0)
    WHERE p.id = r.product_id
    RETURNING p.id INTO prod_id;

    -- Remove the reservation row for this item
    DELETE FROM public.inventory_reservations WHERE id = r.id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ SECURITY DEFINER;

-- IMPORTANT: After deploying, change the owner of this function to your
-- service-role database user to ensure it runs with the correct privileges.
-- Example:
--   ALTER FUNCTION public.finalize_inventory(uuid) OWNER TO postgres_service_role;

-- Fail order RPC: release reservations and mark order as failed
DROP FUNCTION IF EXISTS public.fail_order(uuid);
CREATE OR REPLACE FUNCTION public.fail_order(order_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.release_reservation(order_uuid); -- from previous migration (Sprint 5)
  UPDATE public.orders SET status = 'failed' WHERE id = order_uuid;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ SECURITY DEFINER;

-- IMPORTANT: After deploying, change the owner of this function to your
-- service-role database user to ensure it runs with the correct privileges.
-- Example:
--   ALTER FUNCTION public.fail_order(uuid) OWNER TO postgres_service_role;
