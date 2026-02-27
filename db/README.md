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

New migrations (Sprint 2)
-------------------------

Files added in this sprint:
- db/migrations/20260227_0005_create_profiles_trigger.sql  (auto-create profiles on auth.users INSERT)
- db/migrations/20260227_0006_storage_policy_guidance.sql (storage RLS guidance and policy examples)

Apply the new migrations with Supabase CLI (recommended):

```bash
# from repo root
supabase db push
```

Or apply individually with psql (example):

```bash
PG_CONN="postgres://user:pass@host:5432/dbname"
psql "$PG_CONN" -f db/migrations/20260227_0005_create_profiles_trigger.sql
psql "$PG_CONN" -f db/migrations/20260227_0006_storage_policy_guidance.sql
```

Testing the profiles trigger locally
-----------------------------------
- Use the Supabase local emulator or a local Postgres where you can create the `auth` schema.
- Run the verification script: `psql "$PG_CONN" -f db/tests/verify_profiles_trigger.sql`
- If your hosted Supabase project doesn't allow DDL on `auth.users`, use the Supabase SQL editor
	(Project -> SQL Editor) with a service role key, or test locally.

Storage notes
-------------
- Bucket creation: use `supabase storage create-bucket <name> [--public]` or the Dashboard.
- The guidance migration contains example RLS policies for `storage.objects` to restrict
	inserts/deletes to admin profiles and allow public reads for specific buckets.

Running the Server Actions locally
---------------------------------

To exercise the server-side catalog actions locally:

1. Set environment variables in your shell (do NOT commit these):

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
export DEFAULT_PRODUCT_IMAGE="https://example.com/placeholder.png" # optional
export SUPABASE_STORAGE_BUCKET="product-images" # optional
```

2. Use a short Node script to import and call the functions (example):

```bash
node -e "(async()=>{const c=require('./lib/actions/catalog');console.log(await c.getCategories());console.log(await c.getPublishedProducts({limit:2}));})()"
```

Notes:
- The actions use the Supabase service role key; ensure this key is only used server-side.
- Images returned by the actions are signed URLs (15-minute expiry) and are safe to render on the client.

