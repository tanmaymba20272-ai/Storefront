-- Migration: Create profiles auto-creation trigger for Supabase auth.users
-- Date: 2026-02-27
-- Purpose: Ensure a corresponding row in public.profiles exists when a new
-- user is created in auth.users (Supabase Auth). Idempotent: function is
-- created/replaced and trigger dropped/created.

/*
  Assumptions about Supabase's auth.users table:
  - Supabase exposes an `auth.users` table with at least: `id uuid`, `email text`,
    and `created_at timestamptz` (may be null if created via external provider).
  - In Supabase Edge Functions or RLS policies, helper `auth.uid()` is available
    to get the current authenticated user's id. For a trigger on auth.users we
    use the `NEW` row's `id` since that's the source of truth.
  - Because deployments may already have a `profiles` row (for invites, imports,
    or manual inserts), the trigger only inserts when no profile exists.
*/

-- Create or replace the trigger function in public schema
CREATE OR REPLACE FUNCTION public.create_profile_after_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  uid uuid;
  user_email text;
BEGIN
  -- Prefer the NEW.id; fall back to auth.uid() if for some reason it's available
  uid := COALESCE(NEW.id::uuid, NULL);

  -- Try common email sources. `auth.users` usually exposes `email`; some
  -- setups may use `raw_user_meta` or other JSON fields — adjust if needed.
  user_email := COALESCE(NEW.email, NULL);

  IF uid IS NULL THEN
    -- Nothing to do if we cannot resolve a user id
    RETURN NEW;
  END IF;

  -- Only insert if a profile with this id does not already exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid) THEN
    INSERT INTO public.profiles(id, email, role, created_at)
    VALUES (
      uid,
      user_email,
      'customer', -- default role for auto-created profiles
      COALESCE(NEW.created_at, now())
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger: drop if exists first for idempotence
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'create_profile_after_auth_user_trigger'
      AND n.nspname = 'auth'
  ) THEN
    DROP TRIGGER create_profile_after_auth_user_trigger ON auth.users;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- If auth.users doesn't exist in this environment, skip dropping the trigger.
  NULL;
END$$;

-- Create the trigger on auth.users to fire AFTER INSERT
-- Note: creating triggers on `auth.users` requires appropriate privileges.
-- If your environment does not expose auth schema for DDL, create this trigger
-- using the Supabase project SQL editor or during a deployment with sufficient rights.
CREATE TRIGGER create_profile_after_auth_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_after_auth_user();

-- End of migration
