-- Migration: 20260301_0013_review_media_bucket.sql
-- Guidance for creating a Supabase Storage bucket for review media and example RLS snippets.

-- NOTE: Supabase Storage buckets are created via the Dashboard or the Supabase CLI.
-- This file contains SQL-like guidance and example RLS policies that you can apply
-- in the Supabase SQL editor for the `storage.objects` table to restrict uploads.

-- Recommended bucket name: review-media
-- Path convention: review-media/<user_id>/<filename>

-- Recommended size limits (enforceable in client + storage rules):
-- - Max file size per object: 20MB
-- - Max total per review: ~100MB (enforced client-side / upload orchestration)

-- Example Supabase CLI command (run locally):
-- supabase storage create-bucket review-media --public
-- TODO: Use `--public` only if you intend read access to be public. Otherwise, create private bucket and create signed URLs.

-- Example policy snippet for `storage.objects` to restrict uploads so that authenticated users
-- can only write under their own user_id path and reads are public (if bucket is public).
-- Run the following in Supabase SQL editor (adjust role names if needed):

-- -- Allow authenticated users to insert objects under their own prefix
-- CREATE POLICY "storage_objects_insert_own" ON storage.objects
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'review-media' AND
--     -- restrict key/path to start with the user's uid and a slash
--     (left((string_to_array((auth.uid()::text || '/') || '')[1], 0), 0) IS NOT NULL) -- placeholder
--     -- Practical check: use `auth.uid()` and ensure `new.key` begins with `auth.uid() || '/'`
--   );

-- More practical example using `new`/`auth.uid()`:
-- CREATE POLICY "storage_objects_insert_own_real" ON storage.objects
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'review-media' AND
--     (new.key LIKE (auth.uid() || '/%'))
--   );

-- Example: Make object reads public by allowing select to anon (if bucket is public)
-- CREATE POLICY "storage_objects_select_public" ON storage.objects
--   FOR SELECT
--   TO public
--   USING (bucket_id = 'review-media');

-- TODO: After creating the bucket in the Supabase Dashboard or CLI, paste and enable these policies
-- in the Supabase SQL editor. You may need to tailor the checks to your authentication/role setup.
