# Test: Broadcast endpoint - admin only

Prerequisites:
- Have an admin user in `profiles` with `role = 'admin'` and a valid email.
- Ensure `EMAIL_API_KEY` is stored in `store_settings` (encrypted) and `NEXT_PUBLIC_SITE_URL` env var set.

Example curl (admin session cookie or Authorization header required):

```bash
curl -X POST 'http://localhost:3000/api/admin/email/broadcast' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: supabase-auth-token=<your-admin-session-cookie>' \
  -d '{"subject":"Site Update","html":"<p>Hello admins</p>"}'
```

Expected:
- If caller is admin: HTTP 200 `{ "sent": <number> }`.
- If caller is not admin: HTTP 403.

Notes:
- To create/store `EMAIL_API_KEY` use the Supabase admin UI or CLI to insert into `store_settings` and encrypt using your `SETTINGS_ENCRYPTION_KEY`/helpers.