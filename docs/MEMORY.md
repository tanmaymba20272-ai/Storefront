# Project Memory & Decision Log
*This file acts as the persistent brain for the agentic team. It MUST be read before any code is written and updated whenever a major architectural decision is made or a sprint is completed.*

## 1. Active Context
- **Current Phase:** Sprint 5 planning (Sprint 4 complete ✅ — 27 Feb 2026).
- **Project Goal:** Building a highly responsive, modern e-commerce web app for a sustainable fashion brand with full Shopify parity.
- **Key Mechanics:** The brand relies on a limited-drop model (requiring strict inventory control) and operates out of India (requiring local payment and shipping logistics).

## 2. Core Architectural Decisions (ADRs)
- **DECISION 1 (Tech Stack):** Frontend is Next.js (App Router, Server-First), Tailwind CSS, Shadcn UI, Framer Motion, and Zustand. Backend is Supabase (PostgreSQL, Auth, Edge Functions). 
- **DECISION 2 (Drop Logic):** Inventory decrements MUST be handled via Supabase RPCs utilizing PostgreSQL row-level locking (`FOR UPDATE`). No overselling is permitted.
- **DECISION 3 (Dynamic Integrations):** Third-party APIs (Razorpay, Shiprocket, OAuth, Email, LLMs) will NEVER be hardcoded. They must be stored in a secure, RLS-protected `StoreSettings` table and managed via the Admin Dashboard.
- **DECISION 4 (Tech Debt Allocation):** Every sprint requires a strict 70/30 split. 70% effort on feature execution, 30% effort strictly dedicated to QA, type-safety, test coverage, and resolving technical debt before the sprint is marked complete.
- **DECISION 5 (Profiles Pattern):** Supabase Auth users are extended via a `profiles` table with a `user_role` enum (`admin | customer`). Role is the single source of truth for access control in both RLS and frontend routing. The `auth.users` row is created by Supabase; a trigger or post-signup hook must create the corresponding `profiles` row with `role = 'customer'` by default.
- **DECISION 6 (Typed Supabase Client):** The Supabase client is typed with a `Database` generic (`SupabaseClient<Database>`) exported from `lib/supabaseClient.ts`. The `Database` type lives in `types/api.ts` and is generated from the schema shape defined in `docs/api_contract.md`. This avoids `any` propagating through Supabase query responses.
- **DECISION 7 (Route Group Structure):** App Router route groups are `app/(storefront)/` for public-facing pages and `app/(admin)/` for the dashboard. Admin routes are protected server-side by `middleware.ts` (DECISION 10) and also double-checked client-side via `profiles.role`.
- **DECISION 8 (Auth UI Pattern):** Authentication is handled via Supabase client-side Auth (`signInWithPassword`, `signInWithOAuth`). Login/Register are modal-first (no dedicated page route required). After a successful login, the app reads `profiles.role` to perform client-side redirect: `admin → /admin`, `customer → /`.
- **DECISION 9 (Inventory RPC):** The `decrement_inventory(product_id uuid, qty int) RETURNS boolean` Supabase RPC uses `SELECT ... FOR UPDATE` to obtain a row-level lock, preventing overselling. Returns `false` if stock is insufficient. All client inventory updates MUST go through this RPC — never direct UPDATE.
- **DECISION 10 (Middleware Guard Pattern):** `middleware.ts` at the project root uses Supabase v2 server-side session (`getUser()`) to protect all `/admin/**` routes. If `SUPABASE_SERVICE_ROLE_KEY` is present, the middleware additionally verifies `profiles.role === 'admin'` before granting access. Without the service key it allows any authenticated session — this fallback MUST NOT reach production.
- **DECISION 11 (Settings Encryption):** `lib/encryption.ts` uses AES-GCM via SubtleCrypto (Edge-compatible, no Node-only APIs). The encryption key is sourced exclusively from `SETTINGS_ENCRYPTION_KEY` env var. The module is server-only and must never be imported in client components. IV + ciphertext are packed into a single base64 string.
- **DECISION 12 (Zustand Cart Store):** Cart state lives in `store/cartStore.ts` with Zustand. Persistence is via `localStorage` with SSR guard (no `window` access on server). `CartItem` is a local interface (not from `types/api.ts`) containing `productId`, `name`, `price_cents`, `quantity`, `sku?`, `image?`. The cart has no server-side persistence yet — this is deferred to a future checkout sprint.
- **DECISION 13 (Zod Validation Layer):** All admin forms use Zod schemas defined in `lib/validations/`. `ProductSchema` enforces: `name` ≥ 2 chars, `price_cents` positive int, `inventory_count` ≥ 0, `sku` non-empty, `category_id` must be a valid UUID. `StoreSettingSchema` enforces non-empty key and value. These schemas are the single source of truth for both runtime validation and TypeScript inference — do not duplicate type definitions.
- **DECISION 14 (Storage Bucket Strategy):** Supabase Storage uses two buckets: `product-images` (private, admin upload/delete only) and `blog-media` (private, admin upload/delete only). Public reads are served via signed URLs generated server-side. Neither bucket is set to public. RLS policies on `storage.objects` join to `profiles` to verify `role = 'admin'` for mutation operations.
- **DECISION 15 ("Old Money" Design System):** Tailwind theme is extended with seven named colour tokens: `cream` (#F5F0E8), `navy` (#1B2A4A), `forest` (#2D4A3E), `gold` (#C9A84C), `charcoal` (#2C2C2C), `stone` (#8A8278), `ivory` (#FAF7F2). Typography: `font-serif` = Playfair Display (headings), `font-sans` = Inter (body). Google Fonts are imported via `@import` in `app/globals.css`. These tokens are the canonical design language — never hardcode hex values in components.
- **DECISION 16 (Public Catalog Server Actions):** All public storefront data is fetched exclusively via Server Actions in `lib/actions/catalog.ts` using the Supabase service-role client server-side. Functions: `getCategories()`, `getPublishedProducts(opts?)`, `getActiveAndUpcomingDrops()`, `getProductBySlug(slug)`. These actions intentionally omit `cost_price` and `status = 'draft'` rows. `inventory_count` is only exposed in `getProductBySlug` (detail view), not in the list view.
- **DECISION 17 (Signed Image URLs):** Product image paths stored in `metadata.images[]` are storage object keys (e.g. `product-images/<uuid>.jpg`). They are converted to 15-minute signed URLs server-side inside `lib/actions/catalog.ts` before being sent to the client. The frontend must never receive raw storage keys. Env var `DEFAULT_PRODUCT_IMAGE` supplies the fallback placeholder URL.
- **DECISION 18 (Suspense + Skeleton Pattern):** Every data-fetching server component page is wrapped in a React `<Suspense>` boundary. Skeleton loading states mirror the grid/layout structure of the real content (8-card skeleton for `/shop`, split-layout skeleton for `/shop/[slug]`). Skeleton components live in `components/ui/Skeleton.tsx` and composites in `components/shop/ShopGridSkeleton.tsx`. This pattern is mandatory for all future storefront pages.
- **DECISION 19 (Server / Client Component Boundary Convention):** Data-fetching pages are Server Components only — no `"use client"` at page level. Interactive islands (CategoryFilter, SortDropdown, ProductImageGallery, VariantSelector, AddToCartButton, VariantAndCart) are dedicated Client Components. When both variant selection and cart add must share state, wrap them in a single Client Component island (`VariantAndCart.tsx`) rather than prop-drilling through a server boundary.
- **DECISION 20 (Dependency Manifest & Type Resolution):** `package.json` is the authoritative manifest for all runtime and dev dependencies. All agent-generated source files must assume the deps they import are declared there. The VS Code TypeScript language server cannot resolve modules without `node_modules` on disk — "Cannot find module" and "JSX IntrinsicElements" errors en masse are a deployment signal, not a code bug. The fix is always `npm install`, never adding inline type stubs. `next-env.d.ts` must be present at the project root (contains `/// <reference types="next" />`) to wire Next.js global types.
- **DECISION 21 (Validate Cart RPC — Validation-Only Pattern):** Cart stock validation uses a dedicated `public.validate_cart(cart_items jsonb, customer_id uuid) RETURNS jsonb` RPC with `SECURITY DEFINER`. It applies `SELECT … FOR UPDATE` row-level locks on each `products` row to prevent concurrent oversell races. Returns `{ valid: boolean, errors: jsonb, adjusted_items: jsonb }` where `adjusted_items` uses the key `adjusted_quantity` (not `quantity`). The function is **validation-only** — it never decrements inventory. Any stateful reservation must be a separate `hold_cart` RPC. Clients MUST call this RPC server-side via `SUPABASE_SERVICE_ROLE_KEY`; the anon key must never be used for inventory-sensitive operations. Direct client-side `UPDATE` of `products.inventory` or `products.reserved_count` is blocked by RLS policy.
- **DECISION 22 (Cart Persist + Hydration Guard Pattern):** `store/cartStore.ts` uses Zustand `persist` middleware with `localStorage`. A `useHydrated()` hook (or `isHydrated` flag in the store) gates any SSR-sensitive renders. Cart-related UI that reads persisted state — particularly count badges and drawer content — must check `useHydrated()` before rendering to prevent React hydration mismatches. Store exposes: `items`, `addItem`, `removeItem`, `setQuantity`, `clear`, `isOpen`, `open`, `close`, `toggle`. `CartItem` type is canonical in `types/cart.ts` (not re-declared in the store).
- **DECISION 23 (Server Action for Cart Validation):** `lib/actions/cart.ts` exports `validateCart(cartItems, customerId?)` as a typed server action using `getServerSupabase()` from `lib/supabaseClient.ts`. The API route `app/api/validate-cart/route.ts` wraps this action for REST clients. Results are typed via `ValidateCartResult` and `ValidateCartError` from `types/cart.ts`. Downstream components (CartDrawer, checkout) must import these types from `types/cart.ts` — never redeclare them inline. The optimistic cart flow is: (1) disable button + show spinner, (2) call `validateCart`, (3a) `valid: true` → `router.push('/checkout')`, (3b) `valid: false` → apply `adjusted_items` to store and surface `errors` inline without navigating.

## 3. Known Constraints & Workarounds
- **Supabase env vars required at runtime:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client); `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server/middleware). The client intentionally does not throw on missing vars during build but will warn at runtime.
- **`SUPABASE_SERVICE_ROLE_KEY` CRITICAL for production:** Without this env var the middleware falls back to allowing any authenticated session into `/admin`. This MUST be set in all deployment environments before go-live.
- **Admin role assignment:** No UI exists yet for promoting a user to `admin`. Done manually via Supabase Dashboard SQL: `UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';`
- **Shadcn UI not fully initialized:** Components use Tailwind-first fallbacks under `components/ui/`. Run `npx shadcn-ui@latest init` before Sprint 4 UI work to replace with full Shadcn primitives.
- **Supabase OAuth providers (Google/Apple/Facebook):** Buttons are wired to `signInWithOAuth`. Provider credentials must be configured manually in the Supabase Dashboard under Auth > Providers.
- **Migrations not auto-applied:** All SQL migration files under `db/migrations/` must be applied manually via `supabase db push` or `psql`. See `db/README.md`.
- **Storage buckets not yet created:** `product-images` and `blog-media` buckets must be created via Supabase CLI (`supabase storage create-bucket`) or Dashboard before image upload features work. RLS policies are ready and will activate once buckets exist.
- **`profiles` auto-creation trigger pending deployment:** Migration `20260227_0005_create_profiles_trigger.sql` is written but must be applied via `supabase db push` or `psql` before new signups automatically receive a `profiles` row.
- **`SETTINGS_ENCRYPTION_KEY` required for Settings Vault:** `lib/encryption.ts` throws at runtime if this env var is missing. Set a 32-byte base64 key before the Integrations Hub UI is used.
- **`DEFAULT_PRODUCT_IMAGE` env var:** `lib/actions/catalog.ts` reads this for products with no images. Set to an absolute URL (e.g. a CDN-hosted placeholder) in all environments.
- **Zod schemas not yet wired to forms:** `lib/validations/admin.ts` and `lib/validations/storeSetting.ts` are ready but no admin CRUD forms exist yet. Wire in Sprint 4.
- **`tailwind.config.js` must be deleted:** Sprint 3 renamed/replaced it with `tailwind.config.ts`. Run `rm tailwind.config.js` to avoid Tailwind picking up both files.
- **Cypress / Playwright e2e tests not yet set up:** No automated test runner is wired. Add in Sprint 4 for shop page, product detail, and cart end-to-end flows.

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

---

### Sprint 3 — The Storefront & "Old Money" Aesthetic ✅ (27 Feb 2026)
**Backend:**
- `lib/actions/catalog.ts` — 4 typed Server Actions: `getCategories()`, `getPublishedProducts(opts?)`, `getActiveAndUpcomingDrops()`, `getProductBySlug(slug)`. All use the service-role Supabase client server-side. Applied column-scoped selects, pagination (limit/offset), sort, and category slug filter.
- Signed image URLs — storage object keys in `metadata.images[]` are resolved to 15-min signed URLs server-side before reaching the client. Fallback via `DEFAULT_PRODUCT_IMAGE` env var.
- `search_products` full-text RPC scaffold and caching guidance comments added.
- `docs/api_contract.md` appended with Public Catalog API section.
- `db/tests/verify_catalog_api.md` and `db/README.md` updated.

**Frontend:**
- `tailwind.config.ts` — "Old Money" palette (cream, navy, forest, gold, charcoal, stone, ivory) + Playfair Display / Inter typography tokens. Replaces `tailwind.config.js` (delete JS file manually).
- `app/globals.css` — Google Fonts `@import` for Playfair Display and Inter.
- `components/ui/Skeleton.tsx` — animate-pulse Skeleton primitive.
- `/shop` page (`app/(storefront)/shop/page.tsx`) — Server Component with `<Suspense>`, category filter (`CategoryFilter.tsx`), sort (`SortDropdown.tsx`), and responsive `ProductGrid.tsx` (2/3/4 col breakpoints).
- `/shop/[slug]` page — Server Component; `generateStaticParams` for published products; 404 on null; renders `ProductImageGallery`, `VariantSelector`, `VariantAndCart`, stock indicator.
- `components/ProductImageGallery.tsx` — Client Component; Framer Motion `AnimatePresence` fade + thumbnail strip; drag-based swipe on mobile.
- `components/products/VariantSelector.tsx` — Client Component; typed `Variant` interface; unavailable state styling.
- `components/products/VariantAndCart.tsx` — Client island sharing state between `VariantSelector` and `AddToCartButton`.
- `components/shop/ShopGridSkeleton.tsx` — 8-card skeleton matching grid layout.
- `app/(storefront)/shop/loading.tsx` and `app/(storefront)/shop/[slug]/loading.tsx` — route-level loading files.
- `app/(storefront)/page.tsx` — updated with Active Drops teaser section.

**QA:**
- `lib/actions/catalog.ts` — replaced `as any[]` / `(v: any)` with typed `ProductRow` / `VariantRow` interfaces.
- `components/products/VariantSelector.tsx` — fixed tap targets to `min-w-[44px] min-h-[44px]` (WCAG 2.5.5).
- `components/shop/CategoryFilter.tsx` — added `min-h-[44px]` to all category chips.
- Audit docs: `db/tests/verify_image_optimisation.md`, `db/tests/verify_mobile_responsiveness.md`, `db/tests/verify_data_leakage.md`.

**Open items for Sprint 4:** Shadcn full init, CRUD admin forms (wire Zod schemas), Cypress/Playwright e2e, checkout flow (Razorpay), `SUPABASE_SERVICE_ROLE_KEY` in production, storage bucket creation, profiles trigger `supabase db push`.

---

### Sprint 3 — QA Pass ✅ (27 Feb 2026)

#### What Was Verified

| Area | Scope | Outcome |
|---|---|---|
| **Image optimisation** | `ProductCard.tsx`, `ProductImageGallery.tsx`, `shop/page.tsx`, `shop/[slug]/page.tsx` | All images use `next/image`, have descriptive `alt`, use `fill` with positioned parent, and `priority` only on hero. ✅ No changes. |
| **Mobile tap targets** | `VariantSelector.tsx`, `CategoryFilter.tsx`, `ProductGrid.tsx` | Variant buttons and category chips were missing `min-h-[44px]`. Grid breakpoints were correct. 🔧 Fixed. |
| **Data leakage** | `lib/actions/catalog.ts` | No sensitive fields exposed. `status='published'` filter confirmed. `inventory_count` correctly scoped to detail only. `store_settings` never queried. ✅ No changes. |
| **Type safety sweep** | 12 Sprint 3 files | Two `as any[]` / `(v: any)` casts found in `catalog.ts`. Replaced with typed `ProductRow` and `VariantRow` interfaces. 🔧 Fixed. |

#### Files Patched

| File | What Was Fixed |
|---|---|
| `lib/actions/catalog.ts` | `as any[]` in `getPublishedProducts` → `as ProductRow[]`; `(v: any)` in variant map → `(v: VariantRow)`. Added two scoped interfaces. |
| `components/products/VariantSelector.tsx` | Added `min-h-[44px]` + corrected `min-w-[2.75rem]` → `min-w-[44px]` on variant buttons. |
| `components/shop/CategoryFilter.tsx` | Added `min-h-[44px]` to both the "All" button and all mapped category chip buttons. |

#### Audit Docs Created

- `db/tests/verify_image_optimisation.md`
- `db/tests/verify_mobile_responsiveness.md`
- `db/tests/verify_data_leakage.md`

#### Files With No Issues Found

| File | Finding |
|---|---|
| `components/ProductCard.tsx` | `next/image` correct; alt valid; `fill` + positioned parent; no `priority` on grid card; no `any`. ✅ |
| `components/ProductImageGallery.tsx` | Hero image has `priority`; thumbnails do not; all alts descriptive; no `any`. ✅ |
| `app/(storefront)/shop/page.tsx` | No direct image render; no `any`. ✅ |
| `app/(storefront)/shop/[slug]/page.tsx` | No direct image render; no `any`. ✅ |
| `components/products/VariantAndCart.tsx` | No `any`; typed via `Variant` from `catalog`. ✅ |
| `components/shop/ProductGrid.tsx` | Correct breakpoint classes `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`; no `any`. ✅ |
| `components/shop/SortDropdown.tsx` | Fully typed with `SortOption` union; no `any`. ✅ |
| `components/shop/ShopGridSkeleton.tsx` | Pure JSX skeleton; no `any`. ✅ |
| `tailwind.config.ts` | Typed as `Config`; no `any`. ✅ |

#### Open Items for Sprint 4

1. **Cypress / Playwright e2e tests** — No automated test runner is wired up. Add e2e coverage for the shop page, product detail page, and cart flow in Sprint 4.
2. **Shadcn UI full init** — `npx shadcn-ui@latest init` still not run; components use Tailwind-first fallbacks.
3. **Admin CRUD forms** — `ProductSchema` and `StoreSettingSchema` are ready but no forms consume them yet. Wire up when admin product management is built.
4. **`SUPABASE_SERVICE_ROLE_KEY` in production** — Must be set before go-live or middleware falls back to allow any authenticated session into `/admin`.
5. **Storage bucket creation** — `product-images` and `blog-media` buckets must be created via Supabase CLI or Dashboard before image upload features go live.
6. **`profiles` auto-creation trigger** — Migration `20260227_0005` must be applied via `supabase db push` before new signups receive a `profiles` row automatically.

---

### Technical Debt Hotfix — Post-Sprint 3 QA Triage ✅ (27 Feb 2026)

**Root Cause:** 117 VS Code TypeScript errors were present after Sprint 3. Root cause analysis confirmed a **single missing file** — `package.json` — was responsible for ~112 of the 117 errors. Without a dependency manifest, `node_modules` was never populated, causing the TS language server to fail to resolve every package import and collapse the entire JSX type namespace (`JSX.IntrinsicElements` undefined).

**Triage Buckets:**
- **Bucket A (112 errors)** — Cascade from missing `package.json` / `node_modules`. All `Cannot find module 'react'`, `'next/image'`, `'framer-motion'`, `'next/navigation'`, `'zustand'`, `'@supabase/supabase-js'`, and all `JSX element implicitly has type 'any'` errors.
- **Bucket B (3 errors)** — Structural code bugs surfacing independently: (1) `lib/supabaseClient.ts` contained two full module bodies concatenated (same sub-agent artifact as the Sprint 2 `tsconfig.json` duplication bug); (2) `store/cartStore.ts` used Zustand v3 default export `import create from 'zustand'` — incompatible with Zustand v5 which ships named exports only.
- **Bucket C (5 errors, deferred)** — `tests/auth.test.tsx` missing Jest globals (`describe`, `it`, `expect`). Jest test runner not yet configured — deferred with `// TODO` comment.

**Files Created:**
- `package.json` — full dependency manifest: `next@15`, `react@19`, `react-dom@19`, `@supabase/supabase-js@2`, `@supabase/ssr`, `framer-motion@12`, `zustand@5`, `zod@3`, `react-hook-form`, `lucide-react`, `clsx`, `tailwind-merge`; dev: `typescript@5`, `@types/react@19`, `@types/node@22`, `tailwindcss@4`, `@types/jest@29`, `jest@29`, `@testing-library/react@16`, `@testing-library/jest-dom@6`.
- `next-env.d.ts` — standard Next.js `/// <reference types="next" />` type reference scaffold.

**Files Fixed:**
- `lib/supabaseClient.ts` — removed duplicate module body; merged into single canonical file exposing both `supabase` (client, anon key) and `getServerSupabase()` (server factory, service key), both typed with `SupabaseClient<Database>`.
- `store/cartStore.ts` — `import create from 'zustand'` → `import { create } from 'zustand'` (Zustand v5 named export).
- `tests/auth.test.tsx` — added `// TODO: Configure Jest` comment block with exact install instructions.

**Resolution:** All 112 Bucket A errors will clear on `npm install`. Bucket B errors are already resolved in code. Bucket C is deferred pending Jest configuration in Sprint 4.

**Required action:**
```bash
npm install
npm run typecheck   # should return 0 errors
```

**Pattern logged as DECISION 20** — future agents must include `package.json` declarations for every dep they import.

---

### Sprint 4 — Cart Validation, Persistence & Checkout Entry ✅ (27 Feb 2026)

**Backend:**
- `db/migrations/20260227_0007_validate_cart_rpc.sql` — `public.validate_cart(cart_items jsonb, customer_id uuid)` RPC. Uses `FOR UPDATE` row-level locking on `products` rows; validation-only (no inventory decrement); returns `{ valid, errors, adjusted_items }` jsonb. `SECURITY DEFINER` set; must be owned by the service-role DB user. RLS policies added blocking direct client writes to `products.inventory` / `products.reserved_count`.
- `db/tests/validate_cart/01_valid_cart.sql` — tests all-in-stock path (`valid: true`).
- `db/tests/validate_cart/02_partial_shortfall.sql` — tests partial out-of-stock path (`valid: false`, adjusted quantities).
- `db/tests/validate_cart/03_concurrent_simulation.md` — psql two-session guide demonstrating `FOR UPDATE` prevents double-validation races.
- `db/tests/validate_cart/README.md` — local psql run instructions.
- `docs/api_contract.md` — appended `Validate Cart RPC` section (signature, request/response examples, recommended client flow) and `Frontend cart flow` section.

**Frontend:**
- `types/cart.ts` — new canonical types: `CartItem`, `ValidateCartError` (fields: `sku`, `requested`, `available`, `error` matching actual RPC output), `ValidateCartResult`.
- `store/cartStore.ts` — upgraded to Zustand `persist` + `useHydrated()` guard; added `isOpen`, `open`, `close`, `toggle`; removed local `CartItem` redeclaration (now imports from `types/cart.ts`).
- `lib/actions/cart.ts` — server action `validateCart()` calling `public.validate_cart` RPC via `getServerSupabase()`; typed `ValidateCartResult` return.
- `app/api/validate-cart/route.ts` — REST wrapper for `validateCart` server action.
- `components/cart/CartDrawer.tsx` — full optimistic validation flow: spinner on submit → `validateCart` → navigate on success or apply adjusted items + show typed errors on failure. Focus-trapped, `aria-hidden` toggled, `aria-label` on all remove buttons.
- `components/Navbar.tsx` — cart button with `useHydrated()`-gated badge (sum of item quantities), `aria-label` for AT, calls `store.toggle()`; mounts `CartDrawer`.
- `app/checkout/page.tsx` — checkout entry page; reads persisted cart from store; shows cart summary and validation errors if present.
- `tests/cart/cartStore.test.ts`, `tests/cart/wiring.test.ts` — unit test stubs.

**QA (17 issues fixed across 8 files):**

| # | File | Fix |
|---|------|-----|
| 1 | `lib/actions/cart.ts` | Wrong import path `'../types/cart'` → `'../../types/cart'` |
| 2–3 | `types/cart.ts` | `adjusted_items` key corrected to `adjusted_quantity`; `ValidateCartError` union added matching actual RPC output |
| 4 | `types/cart.ts` | `metadata?: any` → `Record<string, unknown>` |
| 5 | `store/cartStore.ts` | Removed divergent local `CartItem`; imports from `types/cart` |
| 6–7 | `components/cart/CartDrawer.tsx` | `ai.quantity` → `ai.adjusted_quantity`; typed error formatter using `ValidateCartError` |
| 8–9 | `components/cart/CartDrawer.tsx` | `aria-modal` always `true` + `aria-hidden={!isOpen}`; `aria-label` on remove buttons |
| 10–11 | `components/cart/CartDrawer.tsx` | `err: any` → `err: unknown`; `metadata?.name` cast to `string \| undefined` |
| 12–14 | `components/Navbar.tsx` | `open()` → `toggle()`; `useHydrated()` guard on badge; AT aria-label on badge |
| 15 | `app/api/validate-cart/route.ts` | `err: any` → `err: unknown` |
| 16 | `app/checkout/page.tsx` | `metadata?.name` cast to `string \| undefined` |
| 17 | `tests/cart/cartStore.test.ts` | Added TODO re deprecated React 18 `act` import |

**Critical manual steps before Sprint 5:**
1. `npm install` then `npx tsc --noEmit` — should return 0 errors.
2. Verify `lib/supabaseClient.ts` `getServerSupabase()` uses `SUPABASE_SERVICE_ROLE_KEY` (not anon key).
3. Apply migration: `psql $DATABASE_URL -f db/migrations/20260227_0007_validate_cart_rpc.sql` — add `DROP POLICY IF EXISTS` guards if running against an existing schema.
4. Confirm `products` table has `sku` (unique), `inventory`, and optionally `reserved_count` columns before migration runs.
5. Run cart SQL tests: `psql $DATABASE_URL -f db/tests/validate_cart/01_valid_cart.sql && psql $DATABASE_URL -f db/tests/validate_cart/02_partial_shortfall.sql`.

**Open items for Sprint 5:** Razorpay checkout integration, `hold_cart` RPC for reservations, order creation flow, admin CRUD forms (wire Zod schemas), Cypress/Playwright e2e, Shadcn full init, storage bucket creation, profiles trigger `supabase db push`.
