# 02 - Admin RLS Check

This guide shows how to verify that the admin-only enforcement for the `fulfill` endpoint is working.

1) Non-admin call (expected 403):

```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <NON_ADMIN_SESSION_TOKEN>" \
  http://localhost:3000/api/admin/orders/<ORDER_UUID>/fulfill
```

Expected: HTTP 403 with `{ "error": "FORBIDDEN" }`.

2) Admin call (expected 200):

```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_SERVICE_TOKEN>" \
  http://localhost:3000/api/admin/orders/<ORDER_UUID>/fulfill
```

Use the Supabase service-role or an admin session cookie. The response should return fulfillment details on success.

Notes:
- The route enforces `profiles.role === 'admin'` server-side using the Supabase session and `profiles` table lookup.
- For CI tests use a service-role key to perform end-to-end checks.
