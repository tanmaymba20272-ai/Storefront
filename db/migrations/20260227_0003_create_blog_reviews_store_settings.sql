-- Migration: Create blog_posts, reviews, and store_settings tables + RLS
-- Additive / idempotent where practical.

-- Create enum for blog post status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_status') THEN
    CREATE TYPE post_status AS ENUM ('draft','published');
  END IF;
END
$$;

-- Ensure UUID generation function is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Blog posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content jsonb,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  status post_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  comment text,
  verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Store settings (CRITICAL): admin-only via RLS
CREATE TABLE IF NOT EXISTS public.store_settings (
  id serial PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Drop policies if present (idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'blog_posts_select_public') THEN
    EXECUTE 'DROP POLICY blog_posts_select_public ON public.blog_posts';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'blog_posts_write_admins') THEN
    EXECUTE 'DROP POLICY blog_posts_write_admins ON public.blog_posts';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'reviews_insert_auth') THEN
    EXECUTE 'DROP POLICY reviews_insert_auth ON public.reviews';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'reviews_manage_owner_admin') THEN
    EXECUTE 'DROP POLICY reviews_manage_owner_admin ON public.reviews';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'store_settings_admins_only') THEN
    EXECUTE 'DROP POLICY store_settings_admins_only ON public.store_settings';
  END IF;
END
$$;

-- Blog posts: allow authenticated users to read published posts; authors and admins can read all
CREATE POLICY blog_posts_select_public
  ON public.blog_posts
  FOR SELECT
  USING (
    (status = 'published')
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Blog posts: only admins or authors may insert/update/delete
CREATE POLICY blog_posts_write_admins
  ON public.blog_posts
  FOR ALL
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Reviews: allow authenticated users to INSERT reviews (authors = auth.uid())
CREATE POLICY reviews_insert_auth
  ON public.reviews
  FOR INSERT
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.uid() = author_id);

-- Reviews: allow authors to update/delete their reviews and admins to manage all
CREATE POLICY reviews_manage_owner_admin
  ON public.reviews
  FOR ALL
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Store settings: only admins may SELECT/INSERT/UPDATE/DELETE
CREATE POLICY store_settings_admins_only
  ON public.store_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Notes:
-- - `store_settings` must be treated as admin-only. The above policy enforces that only users
--   with a `profiles.role = 'admin'` can read or write rows.
-- - If your client needs to manage settings server-side, use the Supabase service role (server key) which bypasses RLS.
