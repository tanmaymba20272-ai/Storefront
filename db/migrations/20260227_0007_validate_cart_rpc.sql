-- Migration: Add validate_cart RPC and example RLS policies
-- Date: 2026-02-27
-- Creates a validation-only RPC that locks product rows with FOR UPDATE

/*
  validate_cart(cart_items jsonb, customer_id uuid DEFAULT NULL) -> jsonb

  Returns an object:
    { valid: boolean, errors: jsonb, adjusted_items: jsonb }

  - This function is validation-only and does NOT change inventory.
  - It uses SELECT ... FOR UPDATE to obtain row-level locks on matching product rows
    so that concurrent validators/holders will wait and not race to validate the same units.
  - SECURITY DEFINER: this function should be owned by a DB role corresponding
    to your service role (for example, the Supabase "service_role").
    Clients that must perform inventory-sensitive operations should call server-side
    endpoints that invoke this RPC using that service role. Do NOT grant direct
    EXECUTE to untrusted anonymous clients.

  Note on LEAKPROOF: LEAKPROOF is not applied because this function reads database
  tables and therefore cannot be declared leakproof.

  Suggested follow-up RPC: `rpc.hold_cart(cart_items, customer_id, hold_ttl_seconds)`
  which would record reserved_count increments in a transaction and set an expiry.
  That RPC must be a SECURITY DEFINER function owned by the service role as well.

  Defensive behavior:
  - Validates `cart_items` is a JSON array; handles missing `reserved_count` column
    in the `products` table gracefully (assumes 0 reserved if column absent).
  - Handles missing `sku` or missing product rows.
  - Idempotent and read-only with respect to inventory counts.
*/

CREATE OR REPLACE FUNCTION public.validate_cart(cart_items jsonb, customer_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  item jsonb;
  sku text;
  req_qty integer;
  prod_inventory bigint;
  prod_reserved bigint;
  errors jsonb := '[]'::jsonb;
  adjusted jsonb := '[]'::jsonb;
  has_reserved boolean := false;
  available bigint;
BEGIN
  -- Basic validation of input shape
  IF cart_items IS NULL OR jsonb_typeof(cart_items) <> 'array' THEN
    RAISE EXCEPTION 'validate_cart: cart_items must be a jsonb array';
  END IF;

  -- Detect whether products.reserved_count column exists; handle gracefully if not.
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reserved_count'
  ) INTO has_reserved;

  FOR item IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    sku := item ->> 'sku';
    IF sku IS NULL THEN
      errors := errors || jsonb_build_array(jsonb_build_object('sku', NULL, 'error', 'missing_sku'));
      adjusted := adjusted || jsonb_build_array(jsonb_build_object('sku', NULL, 'adjusted_quantity', 0));
      CONTINUE;
    END IF;

    -- defensive quantity parsing
    BEGIN
      req_qty := COALESCE((item ->> 'quantity')::int, 0);
    EXCEPTION WHEN others THEN
      req_qty := 0;
    END;

    -- Fetch inventory and reserved_count (if present) while acquiring a row lock
    IF has_reserved THEN
      EXECUTE 'SELECT inventory, reserved_count FROM public.products WHERE sku = $1 FOR UPDATE' INTO prod_inventory, prod_reserved USING sku;
    ELSE
      EXECUTE 'SELECT inventory, 0::bigint as reserved_count FROM public.products WHERE sku = $1 FOR UPDATE' INTO prod_inventory, prod_reserved USING sku;
    END IF;

    -- If the SELECT found no rows, add not_found error and adjusted 0
    IF NOT FOUND THEN
      errors := errors || jsonb_build_array(jsonb_build_object('sku', sku, 'error', 'not_found'));
      adjusted := adjusted || jsonb_build_array(jsonb_build_object('sku', sku, 'adjusted_quantity', 0));
      CONTINUE;
    END IF;

    IF prod_inventory IS NULL THEN
      prod_inventory := 0;
    END IF;
    IF prod_reserved IS NULL THEN
      prod_reserved := 0;
    END IF;

    available := prod_inventory - prod_reserved;
    IF available < 0 THEN
      available := 0;
    END IF;

    IF req_qty > available THEN
      errors := errors || jsonb_build_array(jsonb_build_object('sku', sku, 'requested', req_qty, 'available', available));
      adjusted := adjusted || jsonb_build_array(jsonb_build_object('sku', sku, 'adjusted_quantity', GREATEST(0, available)));
    ELSE
      adjusted := adjusted || jsonb_build_array(jsonb_build_object('sku', sku, 'adjusted_quantity', req_qty));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', (jsonb_array_length(errors) = 0),
    'errors', errors,
    'adjusted_items', adjusted
  );
END;
$function$;

-- Example RLS and policy guidance below. Adjust claims/role-check logic to match your
-- authentication system (Supabase, Hasura, etc.). The example uses current_setting
-- of a JWT claim; replace with your platform's preferred check.

-- Enable RLS on products table (only run where safe; idempotent when already enabled)
-- NOTE: Run these policies in a safe migration step and verify them in staging.
-- Also ensure the service role (the owner of SECURITY DEFINER functions) is excluded
-- from restrictive policies or granted the necessary privileges.

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow read-only SELECTs to authenticated users (adjust role name as needed)
CREATE POLICY products_select_authenticated ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- Prevent client-side updates to inventory/reserved_count unless the caller is the service role.
-- The condition below checks a JWT claim named "role". Replace the check with your
-- environment's claim name or function (e.g. auth.role() in some setups).
-- If `current_setting('jwt.claims.role', true)` is not available in your environment,
-- replace it with the appropriate check or restrict updates via GRANTS instead.

CREATE POLICY products_restrict_inventory_update ON public.products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Allow updates only when the caller's JWT role is 'service'. Adjust as needed.
    (current_setting('jwt.claims.role', true) = 'service')
  );

-- Note: The above WITH CHECK will effectively deny updates by authenticated clients
-- because their jwt.role will typically be 'authenticated' or 'user'. Service-side
-- code should either run with the service DB role or call SECURITY DEFINER RPCs
-- (owned by the service role) which perform inventory/reservation changes within
-- controlled transactions.

-- END migration
