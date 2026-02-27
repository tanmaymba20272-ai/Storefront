DB Migration README
-------------------

Apply migrations using the Supabase CLI (recommended) or directly with `psql`.

Supabase CLI (from repo root):

```bash
# push local migrations to your Supabase project
supabase db push

# or to run migrations locally against a local Postgres:
supabase start
supabase db remote set <CONNECTION_STRING>
supabase db push
```

Using psql directly (example):

```bash
# Run each migration file in order. Replace PG_CONN with your Postgres connection string.
PG_CONN="postgres://user:pass@host:5432/dbname"
psql "$PG_CONN" -f db/migrations/20260227_0001_create_user_role_and_profiles.sql
psql "$PG_CONN" -f db/migrations/20260227_0002_create_categories_products_drops.sql
psql "$PG_CONN" -f db/migrations/20260227_0003_create_blog_reviews_store_settings.sql
psql "$PG_CONN" -f db/migrations/20260227_0004_create_decrement_inventory_rpc.sql
```

Notes:
- Migrations attempt to be idempotent where practical (DROP POLICY checks, IF NOT EXISTS for types/tables).
- Supabase's service role (server key) bypasses RLS and is intended for trusted server-side operations.
- If you are using Supabase, prefer `supabase db push` to keep migrations and remote schema in sync.
