# Test: Broadcast endpoint - test mode

This guide shows how to run a test send which sends only to the admin's email (no bulk sends).

Example request (admin session required):

```bash
curl -X POST 'http://localhost:3000/api/admin/email/broadcast' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: supabase-auth-token=<your-admin-session-cookie>' \
  -d '{"subject":"Test Email","html":"<p>Test</p>", "test": true}'
```

Expected:
- Sends a single email to the admin email and returns provider response (or `{ sent: 1 }`).

Notes:
- Useful for verifying deliverability and templating without hitting the full recipient list.