# Manual Test Guide: Admin Middleware Route Guard

This document describes how to manually verify that `middleware.ts` correctly protects all `/admin` routes.

---

## Prerequisites

- A running local or staging Supabase instance with `profiles` table and `role` column.
- At least three test accounts:
  - **Anon**: not logged in at all.
  - **Customer**: a `profiles` row with `role = 'customer'`.
  - **Admin**: a `profiles` row with `role = 'admin'`.
- The app running locally (`npm run dev`) with `SUPABASE_URL` and optionally `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`.

---

## Test A — Unauthenticated User

**Goal:** Confirm that a visitor with no session cookie is redirected to `/`.

1. Open an incognito/private browser window (no cookies).
2. Navigate directly to `http://localhost:3000/admin/dashboard`.
3. **Expected result:** The browser is immediately redirected to `http://localhost:3000/`.
4. Open DevTools → Network tab and confirm the `/admin/dashboard` request returns a `307` (or `308`) redirect response with `Location: /`.

---

## Test B — Authenticated Customer (non-admin role)

**Goal:** Confirm that a logged-in user whose profile has `role = 'customer'` is denied access to `/admin` routes.

> **Note:** This test only applies when `SUPABASE_SERVICE_ROLE_KEY` is set. Without it, the middleware falls through (token present → allow). Ensure the env var is present for strict role checking.

1. Sign in as the customer account via the app's login modal.
2. After login, directly navigate to `http://localhost:3000/admin/dashboard`.
3. **Expected result:** The request is redirected to `/`.
4. To confirm the role query ran, temporarily add `console.log('[middleware] role:', role)` to `middleware.ts` and watch the server logs — you should see `role: customer` (or a non-`admin` value) before the redirect.

---

## Test C — Admin User

**Goal:** Confirm that a user with `role = 'admin'` can access `/admin` routes.

1. In the Supabase SQL editor (service role), run:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'youradmin@example.com';
   ```
2. Sign out and sign back in as that admin account.
3. Navigate to `http://localhost:3000/admin/dashboard`.
4. **Expected result:** The page loads normally (no redirect).
5. Navigate to nested routes such as `/admin/products` and `/admin/settings` and confirm they also load.

---

## Test D — SUPABASE_SERVICE_ROLE_KEY absent (fallback mode)

**Goal:** Confirm the safe fallback — when the service role key is not set, any user with a valid session token can reach `/admin` (not ideal for production, but safe default during early dev).

1. Remove or comment out `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and restart the dev server.
2. Sign in as any authenticated user (customer or admin).
3. Navigate to `http://localhost:3000/admin/dashboard`.
4. **Expected result:** Page loads (no redirect). A warning in your team's runbook should note that production deployments MUST have this key set.

---

## What to Check in Supabase Studio

- **Auth > Users**: Confirm the JWT `sub` (user ID) for each test account.
- **Table Editor > profiles**: Confirm `role` column values for each test user.
- **Logs > Edge/Function Logs**: If deploying on Vercel/edge, check function logs for any `no-user` or role mismatch log entries.
