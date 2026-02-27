-- Migration: Create categories, products, and drops tables
-- Additive / idempotent where practical.

-- Ensure UUID generation function is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enum for drop status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drop_status') THEN
    CREATE TYPE drop_status AS ENUM ('upcoming','active','closed');
  END IF;
END
$$;

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Drops
CREATE TABLE IF NOT EXISTS public.drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_at timestamptz,
  end_at timestamptz,
  status drop_status DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  inventory_count integer NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  drop_id uuid REFERENCES public.drops(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on storefront data tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present (idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'categories_select_authenticated') THEN
    EXECUTE 'DROP POLICY categories_select_authenticated ON public.categories';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'categories_write_admins') THEN
    EXECUTE 'DROP POLICY categories_write_admins ON public.categories';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'drops_select_authenticated') THEN
    EXECUTE 'DROP POLICY drops_select_authenticated ON public.drops';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'drops_write_admins') THEN
    EXECUTE 'DROP POLICY drops_write_admins ON public.drops';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'products_select_authenticated') THEN
    EXECUTE 'DROP POLICY products_select_authenticated ON public.products';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'products_write_admins') THEN
    EXECUTE 'DROP POLICY products_write_admins ON public.products';
  END IF;
END
$$;

-- Allow authenticated users to SELECT categories/drops/products (storefront read)
CREATE POLICY categories_select_authenticated
  ON public.categories
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY drops_select_authenticated
  ON public.drops
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY products_select_authenticated
  ON public.products
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Restrict writes (INSERT/UPDATE/DELETE) to admins only
CREATE POLICY categories_write_admins
  ON public.categories
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY drops_write_admins
  ON public.drops
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY products_write_admins
  ON public.products
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Notes:
-- - `auth.role()` and `auth.uid()` are Supabase-provided helpers in RLS context.
-- - Service role (Supabase server key) bypasses RLS; server-side operations can use the service key.
