# Concurrency test instructions — reserve_inventory race

This document shows how to reproduce a concurrent reservation race for a single-SKU with 1 unit left.

Prereqs:
- psql client with access to the database (service-role or superuser recommended for test)
- A product row with `sku = 'TEST-SKU-1'` and `inventory = 1` and `reserved_count = 0`

Two-session reproduction (psql):

1. Open two terminal sessions connected to the same DB:

```bash
# Session A
pqshell='psql "postgresql://user:password@localhost:5432/dbname"'
${pqshell}

# Session B (another terminal)
${pqshell}
```

2. In Session A:

```sql
BEGIN;
SELECT id, inventory, COALESCE(reserved_count,0) FROM public.products WHERE sku = 'TEST-SKU-1' FOR UPDATE;
-- don't commit yet; keep transaction open
```

3. In Session B (concurrently):

```sql
BEGIN;
SELECT id, inventory, COALESCE(reserved_count,0) FROM public.products WHERE sku = 'TEST-SKU-1' FOR UPDATE;
-- This will block until Session A commits or rolls back
```

4. Commit in Session A after updating reserved_count:

```sql
UPDATE public.products SET reserved_count = COALESCE(reserved_count,0) + 1 WHERE sku = 'TEST-SKU-1';
COMMIT;
```

5. Session B will proceed and should observe reserved_count reflecting the update.

Node.js script (optional): see `02_reserve_conflict.sql` for a sample SQL-driven test and accompanying Node snippet below.

Expected outcome:
- One session successfully increments `reserved_count` and the other session detects insufficient available quantity (if using the `reserve_inventory` RPC, the second should receive `INVENTORY_EXHAUSTED`).

Cleanup:
- Use `SELECT public.release_reservation('<order_id>')` to release test reservations created during the test.
