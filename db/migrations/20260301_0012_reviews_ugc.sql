-- Migration: 20260301_0012_reviews_ugc.sql
-- Add UGC fields to reviews table, indexes, and RLS policy guidance

BEGIN;

-- Add new columns for user-generated content on reviews
ALTER TABLE IF EXISTS reviews
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS verified_purchase boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS helpful_count int DEFAULT 0;

-- Indexes to support queries by product and for ranking
CREATE INDEX IF NOT EXISTS idx_reviews_product_created_at ON reviews (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_rating_helpful ON reviews (product_id, rating DESC, helpful_count DESC);

-- Row Level Security (RLS) notes and example policies.
-- IMPORTANT: The following RLS policy SQL assumes RLS is enabled on `reviews`.
-- These statements are provided as a starting point; adjust role names and checks to match your auth setup.

-- Enable RLS (run once via psql / Supabase SQL editor)
-- ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to insert their own reviews.
-- NOTE: `auth.uid()` is available in Supabase Postgres; the check ensures users only insert rows for themselves.
-- CREATE POLICY "reviews_insert_own" ON reviews
--   FOR INSERT
--   TO authenticated
--   USING (true)
--   WITH CHECK (auth.uid() = user_id);

-- Policy: allow authenticated users to update only their own review rows.
-- CREATE POLICY "reviews_update_own" ON reviews
--   FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- Admin/service-role bypass
-- If you need the service role (or admin) to bypass RLS, use a policy that allows a role claim or use a SECURITY DEFINER RPC for admin operations.
-- Example comment (do NOT enable blanket public admin access; prefer RPCs):
-- -- This policy permits the service_role or a custom admin role to bypass checks.
-- -- CREATE POLICY "reviews_admin_bypass" ON reviews
-- --   FOR ALL
-- --   TO postgres
-- --   USING (true);

COMMIT;

-- TODO: After applying migration, add the RLS policies above via the Supabase SQL editor or psql and verify behaviour.
