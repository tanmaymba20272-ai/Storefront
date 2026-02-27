-- Migration: add Shiprocket fulfillment columns to orders
-- Idempotent: uses IF NOT EXISTS so it can be re-run safely

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shiprocket_order_id text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipment_id text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS awb_code text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_name text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS label_url text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'unfulfilled';

-- Index for quick lookup by Shiprocket order id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_orders_shiprocket_order_id'
  ) THEN
    CREATE INDEX idx_orders_shiprocket_order_id ON public.orders (shiprocket_order_id);
  END IF;
END$$;

-- SECURITY NOTES:
-- These fulfillment-related columns may contain sensitive shipment and carrier data.
-- Recommend adding Row Level Security (RLS) policies to ensure only admin roles and
-- backend service-role operations may write to these fields. Example policy:
--   CREATE POLICY admin_only_fulfillment_updates ON public.orders
--     FOR UPDATE USING (auth.role() = 'admin');
-- Also ensure DB ownership and service-role usage patterns are enforced: only admin
-- processes should set `fulfillment_status`, `awb_code`, `shipment_id`, and `label_url`.
