# validate_cart tests

Run the SQL test files against a local development database using `psql`.

Example (macOS / Linux):

```bash
export DATABASE_URL="postgres://user:pass@localhost:5432/mydb"
export PSQL="psql $DATABASE_URL"

# Enable timing for visibility, then run tests
$PSQL -c "\timing on"
$PSQL -f db/tests/validate_cart/01_valid_cart.sql
$PSQL -f db/tests/validate_cart/02_partial_shortfall.sql

# Concurrent simulation is manual; see 03_concurrent_simulation.md for steps
```

Expected outputs (summary):
- `01_valid_cart.sql` should return a JSON object with `valid: true`, empty `errors`,
  and `adjusted_items` containing SKU-A with `adjusted_quantity: 1`.
- `02_partial_shortfall.sql` should return `valid: false`, `errors` with requested > available,
  and `adjusted_items` showing adjusted_quantity 2 for SKU-B.

Notes:
- These tests wrap changes in a transaction and `ROLLBACK` so they leave the database unchanged.
- Do NOT hardcode secrets; use environment-managed DATABASE_URL for test runs.
