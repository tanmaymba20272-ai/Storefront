-- Migration: 20260227_0008_create_orders_table.sql
-- Create orders table for checkout and payment tracking

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  razorpay_order_id text UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','paid','failed','refunded')) DEFAULT 'pending',
  amount_paise bigint NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  items jsonb NOT NULL,
  shipping_address jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders (razorpay_order_id);

-- RLS policy guidance:
-- Service-role (backend) should have write/insert/update permissions to `public.orders`.
-- Example policies to add in a later migration or DB admin step:
-- 1) Allow service role (service_role user) to INSERT/UPDATE/DELETE.
-- 2) Allow authenticated users to SELECT their own orders only:
--    CREATE POLICY "select_own_orders" ON public.orders FOR SELECT USING (auth.uid() = user_id::text);
-- For now, ensure server-side code uses the service role to perform writes.
