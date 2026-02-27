-- Migration: Storage buckets & RLS guidance for Supabase storage
-- Date: 2026-02-27
-- This file contains guidance and example SQL/policy snippets. Some operations
-- (like creating buckets) must be performed via the Supabase CLI / REST API
-- or Dashboard and cannot always be pure SQL in every environment.

/* Enable storage extension if available. In some managed Supabase instances
   this extension is pre-installed and not allowed for direct creation. The
   statement below is safe (IF NOT EXISTS) but may require owner privileges.
*/
CREATE EXTENSION IF NOT EXISTS storage;

-- Example: create a bucket using Supabase CLI (preferred)
-- Run from repo root, requires `supabase` CLI authenticated to your project
--
-- supabase storage create-bucket uploads --public=false
-- supabase storage create-bucket public-assets --public=true

-- Alternatively, create buckets via the Supabase dashboard (Storage -> Create bucket).

-- Bucket-level policies: Supabase uses `storage.objects` (and `storage.buckets`) to
-- manage objects. You cannot always create buckets purely via SQL in hosted
-- environments; use the CLI or dashboard. Below are example RLS policies that
-- illustrate how to restrict operations to admin users and allow public reads.

/*
  Example policy allowing only admin profiles to INSERT or DELETE objects.
  Note: `auth.uid()` is evaluated in the context of the request; service-role
  keys bypass RLS. Depending on your Supabase version, the storage schema/tables
  might be `storage.objects` or similar — adjust the table name accordingly.
*/

-- Deny all by default (if not already set by Supabase-managed policies)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for public (example: public read for a specific bucket)
-- CREATE POLICY "public_bucket_read" ON storage.objects
--   FOR SELECT
--   USING (bucket_id = 'public-assets');

-- Allow INSERT only for admins (checks public.profiles.role)
CREATE POLICY IF NOT EXISTS "storage_insert_admins_only" ON storage.objects
  FOR INSERT
  USING (
    exists(
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Allow DELETE only for admins
CREATE POLICY IF NOT EXISTS "storage_delete_admins_only" ON storage.objects
  FOR DELETE
  USING (
    exists(
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Note: For UPDATE you can similarly restrict columns/operations. If you use
-- signed URLs or the Supabase Storage API from trusted servers, prefer using
-- the service role key which bypasses RLS for admin operations (safer than
-- granting broad client-side permissions).

/* Limitations & operational notes:
 - Many Supabase-hosted projects manage storage schema and helpful policies
   automatically; duplicating them may conflict. Inspect existing policies
   with `select * from pg_policies where tablename = 'objects'`.
 - Bucket creation and bucket-level `public` flags are typically managed by
   the Supabase API/CLI; prefer those methods for deterministic behavior.
 - When writing RLS policies that reference `public.profiles`, ensure profiles
   are kept in sync with auth.users (see migration 20260227_0005 above).
*/

-- End guidance migration
