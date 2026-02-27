-- Test script to verify create_profile_after_auth_user trigger
-- Usage notes:
-- - Running directly against hosted Supabase may be restricted for `auth` schema.
-- - Prefer running this against a local Postgres or Supabase local emulator.

-- 1) Simulate inserting into auth.users (local/emulator):
-- Replace PG_CONN with your connection string and run with psql.
--
-- Example sequence (psql):
-- INSERT INTO auth.users (id, email, created_at) VALUES ('00000000-0000-0000-0000-000000000001', 'test+trigger@example.com', now());
-- -- Then verify the profile exists
-- SELECT * FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001';

-- The script below is written defensively — it will attempt to insert a user
-- only if `auth.users` exists and the id is not already present.

DO $$
DECLARE
  test_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Skip if auth.users is not present in the environment
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid WHERE n.nspname = 'auth' AND c.relname = 'users') THEN
    RAISE NOTICE 'auth.users not present — run this against local/emulator where auth schema is available.';
    RETURN;
  END IF;

  -- Insert test user if missing
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = test_id) THEN
    INSERT INTO auth.users (id, email, created_at) VALUES (test_id, 'test+trigger@example.com', now());
    RAISE NOTICE 'Inserted test user % into auth.users', test_id;
  ELSE
    RAISE NOTICE 'Test user already present in auth.users';
  END IF;

  -- Give DB a moment (transactional environments should be immediate)
  PERFORM pg_sleep(0.1);

  -- Check profile
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = test_id) THEN
    RAISE NOTICE 'Profile exists for % — trigger worked', test_id;
  ELSE
    RAISE WARNING 'Profile does not exist for % — trigger may not be installed or lacks privileges', test_id;
  END IF;
END$$;

-- Manual cleanup (if desired):
-- DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
