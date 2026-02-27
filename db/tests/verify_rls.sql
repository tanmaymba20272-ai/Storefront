-- Verification guide and SQL snippets to validate RLS behavior
-- NOTE: Supabase derives `auth.uid()` and `auth.role()` from JWT claims in HTTP requests.
-- In psql you cannot directly set `auth.uid()`; instead test using the Supabase client with different users
-- or simulate JWT claims via your platform tools. Below are recommended manual verification steps and SQL
-- snippets illustrating expected behavior. This file includes explicit examples for CLI and curl.

-- 1) As a non-admin authenticated user (client JWT with sub = some-user-id):
--    - Attempt to SELECT from store_settings should fail (permission denied or empty results).
-- Example (client-side via Supabase JS):
-- const { data, error } = await supabase.from('store_settings').select('*');
-- -> error should indicate permission denied or empty results for non-admins.
-- Example (curl) — replace <USER_JWT> with a non-admin user's JWT:
-- curl -sS -H "Authorization: Bearer <USER_JWT>" \
--   "https://<PROJECT_REF>.supabase.co/rest/v1/store_settings" | jq

-- 2) As an admin user (profile with role = 'admin'):
--    - SELECT/INSERT/UPDATE/DELETE on store_settings should succeed.
-- Example (curl) — replace <ADMIN_JWT> with an admin user's JWT:
-- curl -sS -H "Authorization: Bearer <ADMIN_JWT>" \
--   "https://<PROJECT_REF>.supabase.co/rest/v1/store_settings" | jq

-- 3) Quick SQL checks when using the Supabase SQL editor (service role / admin context):
--    The SQL editor runs with service privileges (bypasses RLS), so use it to insert test rows:

-- Insert an admin profile for testing (service role required):
-- INSERT INTO public.profiles (id, email, display_name, role) VALUES ('00000000-0000-0000-0000-000000000001','admin@example.com','Admin','admin');

-- Insert a non-admin profile for testing:
-- INSERT INTO public.profiles (id, email, display_name, role) VALUES ('00000000-0000-0000-0000-000000000002','user@example.com','User','customer');

-- Insert a store setting (service role / admin):
-- INSERT INTO public.store_settings (key, value) VALUES ('maintenance_mode','false');

-- 4) Manual simulation: If using psql and you want to emulate a session user, one approach is to
-- set the `request.jwt.claims.sub` GUC if your environment honors it, or run queries from an app
-- client with a JWT. These steps vary by deployment; below is an illustrative example only:
-- -- Example for session emulation (Postgres session GUC) — may not be available in hosted environments
-- SET LOCAL "request.jwt.claims.sub" = '00000000-0000-0000-0000-000000000002';
-- SELECT * FROM public.store_settings; -- should return no rows / permission denied for non-admin
-- If you cannot set session claims, use the Supabase client or REST API with an appropriate JWT.

-- 4a) Supabase CLI guidance (recommended for reproducible tests):
-- Use the Supabase CLI to auth and generate JWTs for test users (or create test users via the SQL editor
-- and sign in via the client to obtain their JWT). Example flow:
-- 1) supabase login
-- 2) Use local dev auth or create test users via SQL editor and generate tokens in your test harness.
-- 3) Use curl examples above with the generated JWTs to validate RLS behavior.

-- 5) Verify product/catalog read for authenticated users:
-- Using an authenticated user JWT, SELECTs against public.products, public.categories, public.drops
-- should succeed (storefront read enabled). Writes should be rejected unless the user is admin.

-- 6) Verify decrement_inventory RPC behavior:
-- -- As service role or via SQL editor (bypass RLS), set up a product:
-- INSERT INTO public.products (id, sku, name, price_cents, currency, inventory_count) VALUES
-- ('11111111-1111-1111-1111-111111111111','SKU001','Test Product',1000,'USD',5);
-- -- Call the function (from service role or a role that has execute privilege):
-- SELECT public.decrement_inventory('11111111-1111-1111-1111-111111111111', 3); -- returns true
-- SELECT public.decrement_inventory('11111111-1111-1111-1111-111111111111', 3); -- returns false (only 2 left)

-- Summary guidance:
-- - Use the Supabase client or REST API with real JWTs for true RLS verification.
-- - Use the Supabase SQL editor (service role) to insert fixtures and create test user profiles.
-- - For automated tests, generate or mint JWTs for a test admin and test customer and run integration tests
--   that exercise SELECT/INSERT/UPDATE/DELETE against `store_settings` using the REST endpoint or client SDK.
-- - If you need help generating JWTs for CI, consider using the Supabase JWT secret and a test harness to mint
--   short-lived tokens for the required `sub` and custom claims (e.g., role).
