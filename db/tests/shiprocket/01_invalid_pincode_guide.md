# 01 - Invalid Pincode Guide

This guide demonstrates how to test the serviceability path where Shiprocket rejects a shipping pincode.

1) Using psql, modify an existing order's shipping pincode to a known-invalid value for your Shiprocket account:

```sh
psql $DATABASE_URL -c "UPDATE public.orders SET shipping_address = jsonb_set(shipping_address, '{pincode}', '"999999"') WHERE id = '<ORDER_UUID>'"
```

Replace `<ORDER_UUID>` with the target order id used for testing.

2) Call the admin fulfill endpoint (local testing):

Use the Supabase service-role token or an admin session cookie for auth in real tests. For simple manual tests you can stub an `Authorization: Bearer <ADMIN_STUB>` header if your local dev server accepts it.

```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_SERVICE_TOKEN>" \
  http://localhost:3000/api/admin/orders/<ORDER_UUID>/fulfill
```

Expected response: HTTP 400 with JSON `{ "error": "SERVICE_UNAVAILABLE", "details": ... }` indicating the pincode is unserviceable.

Notes:
- For local testing, use the Supabase service role or create an admin user and use a valid admin session cookie.
- The route returns `400` specifically for serviceability errors so the frontend or operator can surface a clear message.
