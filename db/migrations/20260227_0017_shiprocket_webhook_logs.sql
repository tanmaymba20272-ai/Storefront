-- Migration: create shiprocket_webhook_logs table
CREATE TABLE IF NOT EXISTS public.shiprocket_webhook_logs (
  id bigserial PRIMARY KEY,
  shiprocket_event jsonb NOT NULL,
  order_id uuid,
  shiprocket_order_id text,
  awb_code text,
  processed_at timestamptz DEFAULT now()
);
