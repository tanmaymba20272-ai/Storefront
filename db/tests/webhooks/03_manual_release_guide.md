# Manual Release & Recovery Guide

If a payment fails or a drop requires manual intervention, use these RPCs to release or finalize reservations.

1) Release reservations for an order (safe for failed payments):

```sql
SELECT public.release_reservation('00000000-0000-0000-0000-0000000000aa'::uuid);
```

2) Finalize inventory for an order (use when payment is confirmed and you need to apply reservations):

```sql
SELECT public.finalize_inventory('00000000-0000-0000-0000-0000000000aa'::uuid);
```

3) If you need to mark an order failed after releasing reservations:

```sql
SELECT public.fail_order('00000000-0000-0000-0000-0000000000aa'::uuid);
```

Notes:
- Use `psql` or your DB admin UI with a service-role user to run these commands.
- `release_reservation` was introduced in Sprint 5; `finalize_inventory` and `fail_order` were added in Sprint 6.
