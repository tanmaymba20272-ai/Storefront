# Manual Test Guide: Storage RLS Verification

This document explains how to verify that Supabase Storage Row Level Security correctly blocks unauthenticated uploads and deletes for the `product-images` and `blog-media` buckets, while allowing admin users to perform those operations.

The policies are defined in `db/migrations/20260227_0006_storage_policy_guidance.sql`.

---

## Prerequisites

- Supabase project running (local or hosted).
- Two buckets created: **`product-images`** and **`blog-media`** (both private/non-public).
  - Via CLI: `supabase storage create-bucket product-images` and `supabase storage create-bucket blog-media`.
  - Or via Supabase Dashboard → Storage → New bucket.
- RLS policies applied (run the migration or apply manually via Dashboard → SQL Editor).
- Supabase JS client (`@supabase/supabase-js`) available in your test environment.

---

## Test 1 — Anonymous Upload Blocked (`product-images`)

**Goal:** Confirm an unauthenticated client cannot upload to `product-images`.

```ts
import { createClient } from '@supabase/supabase-js'

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // No auth session — this is anon
)

const file = new File(['hello'], 'test.jpg', { type: 'image/jpeg' })
const { data, error } = await anonClient.storage
  .from('product-images')
  .upload('test/test.jpg', file)

console.log(data)   // expected: null
console.log(error)  // expected: { message: 'new row violates row-level security policy ...' }
```

**Expected error message:** Something similar to:
```
new row violates row-level security policy for table "objects"
```
or
```
Unauthorized
```

**Verification in Supabase Studio:**
1. Navigate to Storage → `product-images` bucket.
2. Confirm no `test/` folder or `test.jpg` object was created.

---

## Test 2 — Anonymous Upload Blocked (`blog-media`)

Repeat **Test 1** using `anonClient.storage.from('blog-media').upload(...)`.

**Expected:** Same RLS error. No object created in `blog-media`.

---

## Test 3 — Customer Role Upload Blocked

**Goal:** Confirm a logged-in user with `role = 'customer'` cannot upload.

```ts
// Sign in as a customer user and obtain their session
const customerClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
await customerClient.auth.signInWithPassword({
  email: 'customer@example.com',
  password: 'password123',
})

const file = new File(['hello'], 'test-customer.jpg', { type: 'image/jpeg' })
const { error } = await customerClient.storage
  .from('product-images')
  .upload('test/customer.jpg', file)

console.log(error) // expected: RLS violation error
```

**Expected:** Same RLS denial. The `storage_insert_admins_only` policy checks `public.profiles.role = 'admin'`. A customer has `role = 'customer'` so the policy condition returns false → deny.

---

## Test 4 — Admin Upload Allowed

**Goal:** Confirm an admin user can upload to both buckets.

```ts
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
await adminClient.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'adminpassword',
})

const file = new File(['hello'], 'admin-upload.jpg', { type: 'image/jpeg' })

// Test product-images
const { error: e1 } = await adminClient.storage
  .from('product-images')
  .upload('test/admin-upload.jpg', file)
console.log(e1) // expected: null

// Test blog-media
const { error: e2 } = await adminClient.storage
  .from('blog-media')
  .upload('test/admin-upload.jpg', file)
console.log(e2) // expected: null
```

**Verification in Supabase Studio:**
1. Navigate to Storage → `product-images` → confirm `test/admin-upload.jpg` exists.
2. Navigate to Storage → `blog-media` → confirm `test/admin-upload.jpg` exists.

---

## Test 5 — Anonymous Delete Blocked

**Goal:** Confirm anon client cannot delete objects.

```ts
const { error } = await anonClient.storage
  .from('product-images')
  .remove(['test/admin-upload.jpg'])

console.log(error) // expected: RLS violation
```

**Expected:** `new row violates row-level security policy` or `Unauthorized`.

---

## Test 6 — Admin Delete Allowed

```ts
const { error } = await adminClient.storage
  .from('product-images')
  .remove(['test/admin-upload.jpg'])

console.log(error) // expected: null
```

---

## Checking RLS Policies in Supabase Studio

1. Open Supabase Dashboard → **Database → Policies**.
2. Filter by table `storage.objects`.
3. Confirm two policies exist:
   - `storage_insert_admins_only` — FOR INSERT — checks `public.profiles.role = 'admin'`.
   - `storage_delete_admins_only` — FOR DELETE — checks `public.profiles.role = 'admin'`.
4. Confirm no permissive INSERT/DELETE policies exist for `anon` or `authenticated` roles without the admin check.

---

## Notes

- The policies in the migration apply to **all** buckets via `storage.objects`. Bucket-specific policies (using `bucket_id = 'product-images'`) can be added for finer-grained control if needed.
- Service-role clients (used in Edge Functions or server-side code) **bypass RLS** by design — only anon and authenticated role requests are gated by these policies.
- If tests fail with "bucket not found", ensure the buckets exist before applying the policies.
