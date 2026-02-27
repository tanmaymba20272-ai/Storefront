-- Migration: Create decrement_inventory RPC
-- This function safely decrements product inventory inside a transaction.
-- Returns true if inventory was decremented, false if insufficient inventory or product not found.
-- SECURITY: marked SECURITY DEFINER so it can run with privileges; be careful with who owns the function.
-- Note: If RLS blocks the function caller, consider invoking via the service role or ensure the definer role has permission.

CREATE OR REPLACE FUNCTION public.decrement_inventory(product_id uuid, qty integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count integer;
BEGIN
  IF qty IS NULL OR qty <= 0 THEN
    RETURN false;
  END IF;

  -- Lock the row to avoid race conditions
  SELECT inventory_count INTO current_count
    FROM public.products
    WHERE id = product_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false; -- product missing
  END IF;

  IF current_count < qty THEN
    RETURN false; -- insufficient inventory
  END IF;

  UPDATE public.products
    SET inventory_count = inventory_count - qty
    WHERE id = product_id;

  RETURN true;
END;
$$;

-- Grant execute to public if you want callers to be able to call via authenticated sessions.
-- Be careful: RLS may still block actions performed inside the function depending on function owner and row-level policies.
-- For server-side operations, prefer calling this via the Supabase service role (server key) which bypasses RLS.
