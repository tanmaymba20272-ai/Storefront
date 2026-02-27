-- Migration: Inventory TTL expiry job + inventory_audit table
-- Creates a pg_cron job that runs every 5 minutes to abandon stale pending orders
-- and release product reservations. Idempotent via IF NOT EXISTS guards.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- audit table for inventory adjustments
CREATE TABLE IF NOT EXISTS public.inventory_audit (
  id bigserial PRIMARY KEY,
  order_id uuid,
  event text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- function that releases reservations for stale pending orders
CREATE OR REPLACE FUNCTION public.inventory_ttl_release()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rec record;
  item jsonb;
  prod_id uuid;
  qty int;
  has_fn boolean := false;
BEGIN
  -- detect existing RPC to release reservations
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'release_reservation') INTO has_fn;

  FOR rec IN
    SELECT id, items FROM public.orders
    WHERE status = 'pending' AND created_at < now() - interval '15 minutes'
  LOOP
    BEGIN
      IF has_fn THEN
        PERFORM public.release_reservation(rec.id);
      ELSE
        -- iterate items array and decrement reserved_count with row-level locking
        IF rec.items IS NOT NULL THEN
          FOR item IN SELECT jsonb_array_elements(rec.items)
          LOOP
            prod_id := (item->>'product_id')::uuid;
            qty := COALESCE((item->>'quantity')::int, (item->>'qty')::int, 1);
            IF prod_id IS NOT NULL THEN
              UPDATE public.products p
              SET reserved_count = GREATEST(0, p.reserved_count - qty)
              FROM (
                SELECT id FROM public.products WHERE id = prod_id FOR UPDATE
              ) locked
              WHERE p.id = locked.id;
            END IF;
          END LOOP;
        END IF;
      END IF;

      -- mark order abandoned and log audit
      UPDATE public.orders SET status = 'abandoned' WHERE id = rec.id;
      INSERT INTO public.inventory_audit (order_id, event, details) VALUES (rec.id, 'abandoned_due_to_ttl', jsonb_build_object('items', rec.items));
    EXCEPTION WHEN OTHERS THEN
      -- Log and continue on error to avoid job abort across all orders
      INSERT INTO public.inventory_audit (order_id, event, details) VALUES (rec.id, 'error', jsonb_build_object('msg', SQLERRM));
    END;
  END LOOP;
END;
$$;

-- schedule pg_cron job if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'inventory_ttl_release') THEN
    PERFORM cron.schedule('inventory_ttl_release', '*/5 * * * *', $$SELECT public.inventory_ttl_release();$$);
  END IF;
END$$;
