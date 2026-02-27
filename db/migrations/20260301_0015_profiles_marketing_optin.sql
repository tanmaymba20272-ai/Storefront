-- Migration: add marketing_opt_in to profiles
-- Date: 2026-03-01

BEGIN;

-- Add column if it doesn't exist (some projects keep email on auth.users)
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT true;

-- Ensure an email column exists on profiles for legacy installs; if your project
-- uses auth.users.email instead, you can skip this. This is a no-op if column exists.
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing rows to true where NULL to ensure consistent behavior
UPDATE profiles SET marketing_opt_in = true WHERE marketing_opt_in IS NULL;

-- Row Level Security guidance: allow authenticated users to update their own marketing preference
-- (Adjust role names and auth configuration to match your Supabase setup)
-- NOTE: Run these policy statements via psql or Supabase admin if you keep RLS enabled.
-- The example below assumes JWT `sub` maps to `profiles.id` and a role `authenticated` exists.

-- Enable RLS if not already enabled
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Example policy to allow owners to update marketing_opt_in
-- CREATE POLICY "profiles_update_own_marketing_opt_in" ON profiles
--   FOR UPDATE
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.uid() = id OR auth.role() = 'admin');

-- Example RLS policy (commented) that allows profile owners to update only their
-- own `marketing_opt_in` flag. Apply via Supabase/pSQL if you keep RLS enabled:
--
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "profiles_update_own_marketing_opt_in" ON profiles
--   FOR UPDATE
--   USING (auth.uid() = id OR auth.role() = 'admin')
--   WITH CHECK ((auth.uid() = id AND true) OR auth.role() = 'admin');

COMMIT;

-- TODO: Run this migration with your usual migration tooling (psql or Supabase CLI).