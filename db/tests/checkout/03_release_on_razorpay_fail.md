# Release on Razorpay failure — manual rollback instructions

If a Razorpay order creation or subsequent payment step fails after `reserve_inventory` has succeeded, the server code calls `public.release_reservation(order_id)` to undo `reserved_count` increments and delete reservation rows. If you need to perform this manually or debug failures, follow the steps below.

Manual rollback (psql):

```sql
-- As a privileged DB user (service role / postgres)
SELECT public.release_reservation('11111111-1111-1111-1111-111111111111'::uuid);
```

Notes:
- Ensure the function owner is a privileged service-role user and that the function runs with `SECURITY DEFINER` semantics.
- To inspect current reservations:

```sql
SELECT * FROM public.inventory_reservations WHERE order_id = '11111111-1111-1111-1111-111111111111'::uuid;
SELECT id, sku, inventory, reserved_count FROM public.products WHERE sku = 'TEST-SKU-1';
```

If you intend to script automated rollback, call `release_reservation` from a server-side process running with service-role credentials.
# 03_release_on_razorpay_fail

Manual verification steps to ensure reservations are released if Razorpay order creation fails.

1) Prepare a test product with inventory >= 1 and reserved_count = 0.

2) Simulate a failure in the server flow after `reserve_inventory` succeeds but before the order is inserted.
   - Option A: Temporarily change `getRazorpayKeys()` to throw, then invoke the `/api/checkout` endpoint.
   - Option B: Force the Razorpay SDK to fail by setting invalid credentials in `store_settings` (server-only) and calling `/api/checkout`.

3) Expected behaviour:
   - The server should call `public.release_reservation(order_id)` when Razorpay order creation fails.
   - The `products.reserved_count` should be decremented back to its prior value.
   - Any rows in `public.inventory_reservations` for that `order_id` should be deleted.

4) Verification queries (run after failure handling completes):

```sql
SELECT * FROM public.inventory_reservations WHERE order_id = '<order-id-used-in-test>';
SELECT sku, inventory, reserved_count FROM public.products WHERE sku = 'TEST-SKU-...';
```

If the first query returns no rows and the product `reserved_count` matches expected value, the cleanup succeeded.
