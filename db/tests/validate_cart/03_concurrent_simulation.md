# Concurrent Simulation for validate_cart

This document describes how to simulate two concurrent transactions to observe
the `FOR UPDATE` row-locking behavior used by `public.validate_cart`.

Prerequisite: have `psql` connected to the same database from two shells.

Session A (terminal 1):

1. Start a transaction and run the RPC, then sleep to hold the transaction open:

```sql
BEGIN;
-- This will lock the product row(s) for SKU-C until the transaction ends
SELECT public.validate_cart('[{"sku":"SKU-C","quantity":3}]'::jsonb, NULL) AS result;
-- Keep the transaction open to hold the FOR UPDATE locks
SELECT pg_sleep(20);
COMMIT;
```

Session B (terminal 2) — start while Session A is sleeping:

```sql
-- In a separate session run:
BEGIN;
-- This SELECT will block until Session A's transaction is committed/rolled back,
-- demonstrating that the FOR UPDATE lock prevents concurrent conflicting validation.
SELECT public.validate_cart('[{"sku":"SKU-C","quantity":3}]'::jsonb, NULL) AS result;
COMMIT;
```

Behavior to observe:
- If Session A holds the transaction open after calling `validate_cart`, Session B's
  call will block on the same product rows until A commits/rolls back.
- This prevents both sessions from simultaneously believing the same inventory is
  available for overlapping quantities, enabling safe hold/reserve flows.

Notes:
- To reproduce accurately, ensure `SKU-C` exists in `products` and adjust inventory
  and reserved_count as needed before starting the simulation.
- Alternatively use `pg_sleep()` calls inserted into application flows for testing.
