# Project Memory & Decision Log
*This file acts as the persistent brain for the agentic team. It MUST be read before any code is written and updated whenever a major architectural decision is made or a sprint is completed.*

## 1. Active Context
- **Current Phase:** Sprint 3 planning (Sprint 2 complete ✅ — 27 Feb 2026).
- **Project Goal:** Building a highly responsive, modern e-commerce web app for a sustainable fashion brand with full Shopify parity.
- **Key Mechanics:** The brand relies on a limited-drop model (requiring strict inventory control) and operates out of India (requiring local payment and shipping logistics).

## 2. Core Architectural Decisions (ADRs)
- **DECISION 1 (Tech Stack):** Frontend is Next.js (App Router, Server-First), Tailwind CSS, Shadcn UI, Framer Motion, and Zustand. Backend is Supabase (PostgreSQL, Auth, Edge Functions). 
- **DECISION 2 (Drop Logic):** Inventory decrements MUST be handled via Supabase RPCs utilizing PostgreSQL row-level locking (`FOR UPDATE`). No overselling is permitted.
- **DECISION 3 (Dynamic Integrations):** Third-party APIs (Razorpay, Shiprocket, OAuth, Email, LLMs) will NEVER be hardcoded. They must be stored in a secure, RLS-protected `StoreSettings` table and managed via the Admin Dashboard.
- **DECISION 4 (Tech Debt Allocation):** Every sprint requires a strict 70/30 split. 70% effort on feature execution, 30% effort strictly dedicated to QA, type-safety, test coverage, and resolving technical debt before the sprint is marked complete.
- **DECISION 5 (Profiles Pattern):** Supabase Auth users are extended via a `profiles` table with a `user_role` enum (`admin | customer`). Role is the single source of truth for access control in both RLS and frontend routing. The `auth.users` row is created by Supabase; a trigger or post-signup hook must create the corresponding `profiles` row with `role = 'customer'` by default.
- **DECISION 6 (Typed Supabase Client):** The Supabase client is typed with a `Database` generic (`SupabaseClient<Database>`) exported from `lib/supabaseClient.ts`. The `Database` type lives in `types/api.ts` and is generated from the schema shape defined in `docs/api_contract.md`. This avoids `any` propagating through Supabase query responses.
- **DECISION 7 (Route Group Structure):** App Router route groups are `app/(storefront)/` for public-facing pages and `app/(admin)/` for the dashboard. Admin routes enforce a client-side role guard that reads `profiles.role` from Supabase; server-side guard via middleware will be added in a future sprint.
- **DECISION 8 (Auth UI Pattern):** Authentication is handled via Supabase client-side Auth (`signInWithPassword`, `signInWithOAuth`). Login/Register are modal-first (no dedicated page route required). After a successful login, the app reads `profiles.role` to perform client-side redirect: `admin → /admin`, `customer → /`.
- **DECISION 9 (Inventory RPC):** The `decrement_inventory(product_id uuid, qty int) RETURNS boolean` Supabase RPC uses `SELECT ... FOR UPDATE` to obtain a row-level lock, preventing overselling. Returns `false` if stock is insufficient. All client inventory updates MUST go through this RPC — never direct UPDATE.
- **DECISION 10 (Middleware Guard Pattern):** `middleware.ts` at the project root uses Supabase v2 server-side session (`getUser()`) to protect all `/admin/**` routes. If `SUPABASE_SERVICE_ROLE_KEY` is present, the middleware additionally verifies `profiles.role === 'admin'` before granting access. Without the service key it allows any authenticated session — this fallback MUST NOT reach production.
- **DECISION 11 (Settings Encryption):** `lib/encryption.ts` uses AES-GCM via SubtleCrypto (Edge-compatible, no Node-only APIs). The encryption key is sourced exclusively from `SETTINGS_ENCRYPTION_KEY` env var. The module is server-only and must never be imported in client components. IV + ciphertext are packed into a single base64 string.
- **DECISION 12 (Zustand Cart Store):** Cart state lives in `store/cartStore.ts` with Zustand. Persistence is via `localStorage` with SSR guard (no `window` access on server). `CartItem` is a local interface (not from `types/api.ts`) containing `productId`, `name`, `price_cents`, `quantity`, `sku?`, `image?`. The cart has no server-side persistence yet — this is deferred to a future checkout sprint.
- **DECISION 13 (Zod Validation Layer):** All admin forms use Zod schemas defined in `lib/validations/`. `ProductSchema` enforces: `name` ≥ 2 chars, `price_cents` positive int, `inventory_count` ≥ 0, `sku` non-empty, `category_id` must be a valid UUID. `StoreSettingSchema` enforces non-empty key and value. These schemas are the single source of truth for both runtime validation and TypeScript inference — do not duplicate type definitions.
- **DECISION 14 (Storage Bucket Strategy):** Supabase Storage uses two buckets: `product-images` (private, admin upload/delete only) and `blog-media` (private, admin upload/delete only). Public reads are served via signed URLs generated server-side. Neither bucket is set to public. RLS policies on `storage.objects` join to `profiles` to verify `role = 'admin'` for mutation operations.

## 3. Known Constraints & Workarounds
- **Supabase env vars required at runtime:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client); `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server/middleware). The client intentionally does not throw on missing vars during build but will warn at runtime.
- **`SUPABASE_SERVICE_ROLE_KEY` CRITICAL for production:** Without this env var the middleware falls back to allowing any authenticated session into `/admin`. This MUST be set in all deployment environments before go-live.
- **Admin role assignment:** No UI exists yet for promoting a user to `admin`. Done manually via Supabase Dashboard SQL: `UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';`
- **Shadcn UI not fully initialized:** Components use Tailwind-first fallbacks under `components/ui/`. Run `npx shadcn-ui@latest init` before Sprint 3 UI polish to replace with full Shadcn primitives.
- **Supabase OAuth providers (Google/Apple/Facebook):** Buttons are wired to `signInWithOAuth`. Provider credentials must be configured manually in the Supabase Dashboard under Auth > Providers.
- **Migrations not auto-applied:** All SQL migration files under `db/migrations/` must be applied manually via `supabase db push` or `psql`. See `db/README.md`.
- **Storage buckets not yet created:** `product-images` and `blog-media` buckets must be created via Supabase CLI (`supabase storage create-bucket`) or Dashboard before upload features work. RLS policies are ready and will activate once buckets exist.
- **`profiles` auto-creation trigger pending deployment:** Migration `20260227_0005_create_profiles_trigger.sql` is written but must be applied via `supabase db push` or `psql` before new signups automatically receive a `profiles` row.
- **`SETTINGS_ENCRYPTION_KEY` required for Settings Vault:** `lib/encryption.ts` throws at runtime if this env var is missing. Set a 32-byte base64 key before the Integrations Hub UI is used.
- **Zod schemas not yet wired to forms:** `lib/validations/admin.ts` and `lib/validations/storeSetting.ts` are ready but no admin CRUD forms exist yet. Wire in Sprint 3.

---

## 4. Sprint Log

### Sprint 1 — Architecture, Auth & Dynamic Settings Foundation ✅ (27 Feb 2026)
**Schema:** 7 tables created — `profiles`, `categories`, `drops`, `products`, `blog_posts`, `reviews`, `store_settings`.
**RLS:** Enabled on all tables. `store_settings` is strictly admin-only (deny-by-default for all non-admins). Inventory decrement is protected via `FOR UPDATE` RPC.
**Auth:** Supabase Auth configured for Email/Password + OAuth scaffolding (Google, Apple, Facebook).
**Frontend:** Root layout, Navbar, Footer, `(storefront)` and `(admin)` route groups, Login/Register modal UI delivered.
**QA:** `tsconfig.json` added with `strict` mode. `types/api.ts` fully typed with `Database` generic. `lib/supabaseClient.ts` typed with `SupabaseClient<Database>`. No `any` types remain in delivered files.
**Docs:** `docs/api_contract.md`, `db/README.md`, `db/tests/verify_rls.sql`, `docs/frontend_readme.md` all created.
**Open items for Sprint 2:** Middleware-based admin guard, Shadcn init, `profiles` auto-creation trigger, OAuth provider configuration in Supabase Dashboard.

---

### Sprint 2 — Admin Dashboard, CMS & Master Integration Hub ✅ (27 Feb 2026)
**Backend:**
- Added Supabase Postgres trigger (`20260227_0005`) — auto-creates `profiles` row with `role='customer'` on every new `auth.users` signup.
- Storage bucket RLS guidance migration (`20260227_0006`) — policies block anon/customer upload & delete on `storage.objects`; admin-only mutations via `profiles.role` join.
- `lib/encryption.ts` — AES-GCM SubtleCrypto encrypt/decrypt for `store_settings` values; keyed from `SETTINGS_ENCRYPTION_KEY` env var.
- `search_products` RPC scaffold added; `docs/api_contract.md` updated with Server Action signatures and encryption utility notes.

**Frontend:**
- `middleware.ts` — server-side admin guard using Supabase v2 `getUser()` + `profiles.role` check; redirects non-admins to `/`.
- `components/ui/` — minimal accessible Tailwind-first primitives (Button, Card, Dialog, Input, Label, Badge) pending full Shadcn init.
- Storefront pages: product catalogue grid (`app/(storefront)/products/page.tsx`), product detail with Add-to-Cart (`app/(storefront)/products/[slug]/page.tsx`), drops listing with Framer Motion countdown (`app/(storefront)/drops/page.tsx`).
- `store/cartStore.ts` — Zustand cart with `localStorage` persistence and SSR guard.
- `components/cart/CartDrawer.tsx` — Framer Motion slide-in cart drawer wired to Navbar icon.
- Admin shell: `app/(admin)/dashboard/page.tsx` + `components/admin/Sidebar.tsx` with nav links.

**QA:**
- Fixed `tsconfig.json` (duplicate JSON objects merged).
- Fixed `middleware.ts` Supabase v2 API bug (`data.id` → `user.id`).
- Removed `(globalThis as any)` casts from `lib/encryption.ts`.
- Fixed dead import in `store/cartStore.ts`.
- Typed `(p: any)` and `(d: any)` map callbacks in storefront pages.
- Added `lib/validations/admin.ts` (ProductSchema) and `lib/validations/storeSetting.ts` (StoreSettingSchema).
- Added `db/tests/verify_middleware_guard.md` and `db/tests/verify_storage_rls.md`.

**Open items for Sprint 3:** Shadcn full init, set `SUPABASE_SERVICE_ROLE_KEY` in deployment, create storage buckets, apply profiles trigger migration, wire Zod schemas into admin CRUD forms, add Cypress/Playwright e2e tests.

---

### Sprint 2 — QA Pass ✅ (27 Feb 2026)

#### What Was Verified

| Area | Status | Notes |
|---|---|---|
| `tsconfig.json` correctness | ✅ Fixed | File contained two concatenated JSON objects (invalid). Merged into one canonical object. |
| Middleware admin guard logic | ✅ Fixed + Audited | `userRes?.data?.id` bug fixed → `userRes?.user?.id` (Supabase v2 API shape). `profiles` query explicitly cast to `Array<{ role: string }> \| null` to eliminate silent `any`. Catch variable typed as `unknown`. |
| Storage RLS guidance | ✅ Audited | `20260227_0006_storage_policy_guidance.sql` policies apply to all `storage.objects` rows. Manual test guide created covering `product-images` and `blog-media` buckets explicitly, anon/customer/admin roles, and Supabase Studio verification steps. |
| Zod validation schemas | ✅ Added | `lib/validations/admin.ts` — `ProductSchema` + `ProductEditSchema` with strict rules (name min 2, price_cents positive int, inventory_count non-negative int, sku non-empty, category_id uuid). `lib/validations/storeSetting.ts` — `StoreSettingSchema` (key + value non-empty strings). Both export inferred TypeScript types. |
| Type safety sweep — Sprint 2 files | ✅ Patched | See code changes below. |

#### Code Changes

- **`tsconfig.json`** — Replaced dual-object file with a single valid JSON. Canonical settings retained: `strict`, `noImplicitAny`, `esModuleInterop`, `skipLibCheck`, `jsx:preserve`, `incremental`, `resolveJsonModule`, `isolatedModules`, `forceConsistentCasingInFileNames`, `target:ES2020`, `module:ESNext`, `moduleResolution:Node`, `baseUrl:.`, `lib:[DOM,ES2020]`.
- **`middleware.ts`** — Fixed `userRes?.data?.id` → `userRes?.user?.id`. Typed `profiles` query result as `Array<{ role: string }> | null`. Typed catch variable as `unknown`. Replaced `profiles[0]?.role` with null-safe explicit length check.
- **`lib/encryption.ts`** — Removed two `(globalThis as any).crypto` casts in `encryptSettings` and `decryptSettings`. Both replaced with `globalThis.crypto?.subtle` (typed correctly via `lib:DOM`) and `const subtle: SubtleCrypto = globalThis.crypto.subtle`.
- **`store/cartStore.ts`** — Removed unused import `import type { CartItem as ApiCartItem } from '../../types/api'`. `CartItem` does not exist in `types/api.ts` and the alias was never referenced. Path was also incorrect (`../../types/api` → should be `../types/api`).
- **`app/(storefront)/products/page.tsx`** — Replaced `(p: any)` map callback with local `ProductListItem` interface matching the selected columns (`id, name, slug, price_cents, image?, drop_active?`).
- **`app/(storefront)/drops/page.tsx`** — Replaced `(d: any)` map callback with local `ActiveDrop` interface matching the accessed fields (`id, name, description?, ends_at?`).
- **`db/tests/verify_middleware_guard.md`** — New file: 4-scenario manual test guide for the middleware route guard (anon, customer, admin, fallback mode).
- **`db/tests/verify_storage_rls.md`** — New file: 6-test manual verification guide for storage RLS covering both `product-images` and `blog-media` buckets.
- **`lib/validations/admin.ts`** — New file: `ProductSchema`, `ProductEditSchema` and their inferred types.
- **`lib/validations/storeSetting.ts`** — New file: `StoreSettingSchema` and inferred type.

#### Files With No Issues Found

| File | Finding |
|---|---|
| `components/ProductCard.tsx` | Fully typed; no `any`. Local `Product` type is explicit. ✅ |
| `components/DropCountdown.tsx` | Fully typed; no `any`. Props typed as `{ endsAt: string }`. ✅ |
| `components/cart/CartDrawer.tsx` | No `any`; consumes `CartItem` from `store/cartStore`. ✅ |
| `components/admin/Sidebar.tsx` | Pure JSX with no data; no `any`. ✅ |
| `app/(storefront)/products/[slug]/page.tsx` | Uses typed Supabase client response; no explicit `any`. ✅ |
| `app/(admin)/dashboard/page.tsx` | Shell only; no data fetching; no `any`. ✅ |

#### Remaining Open Items

1. **Shadcn UI full init** — `npx shadcn-ui@latest init` has not been run. Components rely on Tailwind-first fallbacks. Must be completed before Sprint 3 UI polish.
2. **`SUPABASE_SERVICE_ROLE_KEY` env var** — Without this set in production `.env`, the middleware falls back to "any authenticated user can enter `/admin`". This MUST be set before go-live.
3. **`product-images` / `blog-media` bucket creation** — Buckets do not yet exist (they require CLI or Dashboard creation). The storage RLS policies are ready but inert until buckets are created.
4. **Formal e2e / integration tests** — No automated test runner is wired up. Cypress or Playwright integration tests for the middleware guard and storage RLS should be added in Sprint 3.
5. **`profiles` auto-creation trigger** — New Auth signups do not yet automatically create a `profiles` row. This trigger must be added (see Sprint 1 open items) before any role-based feature works end-to-end.
6. **Zod schemas not yet wired to forms** — `ProductSchema` and `StoreSettingSchema` are ready but no forms exist yet in the admin shell to consume them. Wire up in Sprint 3 when admin CRUD forms are built.
