-- Migration: 20260227_0009_reserve_inventory_rpc.sql
-- Creates inventory_reservations table and RPCs to reserve/release inventory

-- Create reservations table if not present
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity bigint NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL
);

-- Reserve inventory RPC
-- Note: function is SECURITY DEFINER and should be owned by the DB `service_role` user.
-- It runs in a single transaction and will NOT persist changes if any item is unavailable.
CREATE OR REPLACE FUNCTION public.reserve_inventory(cart_items jsonb, order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  it jsonb;
  _sku text;
  _qty bigint;
  prod_id uuid;
  inv bigint;
  reserved_count bigint;
  available bigint;
BEGIN
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_CART');
  END IF;

  -- First pass: check availability while locking rows to avoid races
  FOR it IN SELECT * FROM jsonb_array_elements(cart_items) LOOP
    _sku := (it->> 'sku');
    _qty := (it->> 'quantity')::bigint;

    IF _sku IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_ITEM');
    END IF;

    SELECT id, sku, inventory, COALESCE(reserved_count,0) INTO prod_id, _sku, inv, reserved_count
      FROM public.products
      WHERE sku = _sku
      FOR UPDATE;

    IF prod_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'SKU_NOT_FOUND', 'sku', _sku);
    END IF;

    available := inv - reserved_count;
    IF _qty > available THEN
      RAISE NOTICE 'Inventory exhausted for SKU %: requested %, available %', _sku, _qty, available;
      RETURN jsonb_build_object('success', false, 'error', 'INVENTORY_EXHAUSTED', 'sku', _sku);
    END IF;
  END LOOP;

  -- Second pass: all items available. Apply updates and insert reservation rows.
  FOR it IN SELECT * FROM jsonb_array_elements(cart_items) LOOP
    _sku := (it->> 'sku');
    _qty := (it->> 'quantity')::bigint;

    SELECT id, inventory, COALESCE(reserved_count,0) INTO prod_id, inv, reserved_count
      FROM public.products
      WHERE sku = _sku
      FOR UPDATE;

    -- Update reserved_count (do not decrement inventory)
    UPDATE public.products
      SET reserved_count = COALESCE(reserved_count,0) + _qty
      WHERE id = prod_id;

    -- Insert reservation mapping
    INSERT INTO public.inventory_reservations (order_id, product_id, quantity)
      VALUES (order_id, prod_id, _qty);
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

ALTER FUNCTION public.reserve_inventory(jsonb, uuid) OWNER TO postgres;
COMMENT ON FUNCTION public.reserve_inventory(jsonb, uuid) IS 
  'SECURITY DEFINER recommended. Function owner should be the service-role DB user. Runs a single transactional reservation pass using row-level locks (FOR UPDATE). Does not decrement inventory; increments reserved_count and writes inventory_reservations. Reservations may have an expiry (handled by background job in a future sprint).';

-- Release reservation RPC: undo reserved_count increments and delete reservations for an order_id
CREATE OR REPLACE FUNCTION public.release_reservation(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM public.inventory_reservations WHERE order_id = p_order_id LOOP
    UPDATE public.products
      SET reserved_count = GREATEST(0, COALESCE(reserved_count,0) - r.quantity)
      WHERE id = r.product_id;
  END LOOP;

  DELETE FROM public.inventory_reservations WHERE order_id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

ALTER FUNCTION public.release_reservation(uuid) OWNER TO postgres;
COMMENT ON FUNCTION public.release_reservation(uuid) IS 
  'SECURITY DEFINER recommended. Releases reserved_count and deletes inventory_reservations rows for the provided order_id.';

-- Notes:
-- - The functions use SECURITY DEFINER semantics; ensure the function owner is a privileged DB user (service role) and that the search_path is appropriately locked-down.
-- - Automatic expiry/TTL of reservations is not implemented here; a background worker or scheduled job should call release_reservation for expired reservations.
