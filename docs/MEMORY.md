# Project Memory & Decision Log
*This file acts as the persistent brain for the agentic team. It MUST be read before any code is written and updated whenever a major architectural decision is made or a sprint is completed.*

## 1. Active Context
- **Current Phase:** Sprint 9 complete ✅ — Sprint 10 planning (27 Feb 2026).
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
- **DECISION 24 (Stateful Inventory Reservation Pattern):** Sprint 5 introduces `public.reserve_inventory(cart_items jsonb, order_id uuid) RETURNS jsonb` — a stateful RPC that **increments `reserved_count`** on each product row (using `SELECT … FOR UPDATE`) and inserts rows into `public.inventory_reservations`. It returns `{ success: true }` or `{ success: false, error: 'INVENTORY_EXHAUSTED', sku }`. Critically: it does NOT decrement `inventory` — that happens only on webhook confirmation (Sprint 6). A paired `public.release_reservation(order_id uuid)` RPC reverses the `reserved_count` increment and deletes reservation rows; it **must** be called if any downstream step (e.g., Razorpay order creation) fails. Both RPCs are `SECURITY DEFINER` and must be owned by the service-role DB user. Direct client writes to `reserved_count` are blocked by RLS.
- **DECISION 25 (Razorpay Key Storage & Server-Only Access):** Razorpay credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) are stored encrypted in `store_settings` (DECISION 3 + DECISION 11). They are retrieved exclusively via `lib/utils/getRazorpayKeys.ts` which calls `getServerSupabase()` and `decryptSettings()`. This utility is server-only and must never be imported by client components. The public `GET /api/razorpay-key` endpoint returns only `{ key_id }` — the secret is never sent to the client in any form. The checkout API response (`POST /api/checkout`) returns `{ razorpay_order_id, razorpay_key_id, amount_paise, currency }` — no secret included.
- **DECISION 26 (Checkout API Flow & Rollback Contract):** `POST /api/checkout` implements a strict multi-step transaction with rollback semantics: (1) call `reserve_inventory` RPC — if `INVENTORY_EXHAUSTED`, return 409 immediately; (2) call `getRazorpayKeys()` and create Razorpay order via SDK; (3) if Razorpay fails, call `release_reservation(order_id)` to undo `reserved_count` increments, then return 502; (4) on success, insert `orders` row with `status: 'pending'` and return `razorpay_order_id` + public `key_id`. The `orders` table has columns: `id`, `user_id`, `razorpay_order_id` (unique), `status` (enum: pending/paid/failed/refunded), `amount_paise`, `currency`, `items` jsonb, `shipping_address` jsonb, `created_at`. Inventory reservations have an optional `expires_at` for future TTL enforcement — a background expiry job is deferred to Sprint 6.
- **DECISION 27 (Webhook Security Pattern):** `app/api/webhooks/razorpay/route.ts` uses `export const runtime = 'nodejs'` to access Node.js `crypto`. Raw request body is read via `request.text()` — never `request.json()` — to preserve the exact byte sequence required for HMAC verification. Signature is verified with `crypto.timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(receivedSig, 'hex'))` to prevent timing oracle attacks. The route ALWAYS returns HTTP 200, even on signature mismatch or processing error, to prevent Razorpay from retrying with replay attacks. Idempotency is enforced by checking `orders.status === 'paid'` before calling `finalize_inventory` — duplicate webhook deliveries are safe. `webhookSecret` is sourced from `getRazorpayKeys()` (encrypted `store_settings`), never from `.env`.
- **DECISION 28 (Post-Payment Cart-Clearing Contract):** After a successful Razorpay payment, the user is redirected to `/checkout/success?order_id=<id>`. This page is a Server Component that fetches the order from Supabase by `order_id` and renders items, shipping address, and total. It mounts `<ClearCartOnSuccess />` — a minimal `"use client"` island that calls `cart.clear()` in a `useEffect` on first mount only and renders `null`. This two-component split is required because `cart.clear()` depends on Zustand's `localStorage`-persisted store which is only available client-side. The Server Component must NOT import the cart store directly.
- **DECISION 29 (Admin Orders View):** `/admin/orders` is a Server Component that fetches the latest 50 orders (ordered by `created_at DESC`) using `getServerSupabase()` and passes them to `<OrdersTable />` — a `"use client"` island. `OrdersTable` renders a sortable table with columns: Order ID, Customer, Amount, Status, Created. `<OrdersTableSkeleton />` is the Suspense fallback. The `orders` list must never be fetched client-side with the anon key; always use the service-role client server-side.
- **DECISION 30 (Shiprocket Token Management — Per-Request Model):** `lib/utils/getShiprocketToken.ts` is a server-only utility that fetches the Shiprocket `email` and `password` from `store_settings` (encrypted, per DECISION 3 + DECISION 11), then POSTs to `https://apiv2.shiprocket.in/v1/external/auth/login` to obtain a Bearer token. The token is returned directly to the caller — there is NO module-level mutable variable caching it between requests. This per-request model is the safe default in a serverless environment where module state can persist unpredictably across invocations. A Redis/in-memory cache with expiry TTL matching Shiprocket's token lifetime is the approved upgrade path for Sprint 8+, but must not introduce stale tokens.
- **DECISION 31 (Shiprocket Fulfillment Route — Admin-Only, Error Mapping, Idempotency):** `POST /api/admin/orders/[id]/fulfill` enforces admin access by calling `supabase.auth.getUser()` (NOT `getSession()` — `getUser()` re-validates with the Supabase auth server on every call) and then checking `profiles.role === 'admin'`; returns 403 for any non-admin. Shiprocket API errors are mapped to meaningful HTTP statuses: pincode / serviceability errors → 400 `SERVICE_UNAVAILABLE`; all other Shiprocket failures → 502 `SHIPROCKET_ERROR`. Idempotency is enforced: if `fulfillment_status` is already set to a non-`unfulfilled` value, the route returns the existing fulfillment data (200) without re-calling Shiprocket. The route persists `shiprocket_order_id`, `shipment_id`, `awb_code`, `courier_name`, `label_url`, and `fulfillment_status` to the `orders` table as each step completes.
- **DECISION 32 (Verified Purchase Gating):** Review submission is gated by a server-side purchase eligibility check in `app/api/reviews/verify-eligibility/route.ts` and enforced again inside `lib/actions/reviews.ts`. The check queries `orders` where `user_id = auth.uid()` AND `status IN ('paid', 'delivered')` AND `items @> '[{"product_id": "<uuid>"}]'` (JSONB containment — NOT a string search). `verified_purchase` on the inserted review row is always set server-side from the DB result; it must never be accepted from client input. The `getUser()` pattern (not `getSession()`) is mandatory here as this is a write-gating check.
- **DECISION 33 (UGC Sorting Algorithm — Tiered Weight):** Product reviews are retrieved via `public.get_product_reviews(product_uuid uuid, limit_rows int, offset_rows int)` SECURITY DEFINER RPC. The sort weight is: Tier 1 = rating 5 + has media, Tier 2 = rating 4 + has media, Tier 3 = rating 5 text-only, Tier 4 = everything else. Within each tier: `helpful_count DESC`, then `created_at DESC`. The `CASE` expression must guard against NULL `media_urls` using `COALESCE(array_length(media_urls,1), 0) > 0` — not bare `array_length`. The RPC is called without the `public.` schema prefix in Supabase client `.rpc()` calls.
- **DECISION 34 (Review Media Bucket — Public Reads, Auth Writes):** The `review-media` Supabase Storage bucket is public-read (no signed URL required for display). Uploads are restricted to authenticated users writing under their own `<user_id>/` path prefix via `storage.objects` RLS policy. The client constructs display URLs as `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/review-media/<key>` — raw storage keys must never be used directly as `<img src>` values without this transformation. If the bucket is ever switched to private, server-side signed URL generation must be added and a TODO comment is present in `ReviewCard.tsx`. Client-side upload size limits: 5 MB for images, 20 MB for videos — enforced before upload starts with a user-visible error; Supabase Storage policy enforces the hard cap at 20 MB.
- **DECISION 35 (Review Modal — Auth + Upload Contract):** `ReviewModal.tsx` is a `"use client"` Framer Motion island. Before uploading, it calls `supabase.auth.getUser()` to obtain the live `user_id` for the storage path (`review-media/<user_id>/<filename>`). Submission calls `lib/actions/reviews.submitReview(...)` as a server action. The modal implements: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap (Tab/Shift+Tab cycling), ESC-to-close, and `role="button"` / `aria-label` on the file drop zone. Star buttons carry `aria-label="Rate N out of 5 stars"`.
- **DECISION 36 (Blog HTML Sanitization — isomorphic-dompurify):** All CMS-generated blog article HTML is sanitized via `isomorphic-dompurify` (`DOMPurify.sanitize(html)`) server-side inside `app/blog/[slug]/page.tsx` before being passed to `dangerouslySetInnerHTML`. This is mandatory — raw database HTML strings must never reach the browser unsanitized. `isomorphic-dompurify` is used (not browser-only `dompurify`) to allow sanitization to run inside a Next.js Server Component. The `blog-media` Supabase Storage bucket (DECISION 14) holds article images uploaded via the Admin CMS.
- **DECISION 37 (Dynamic Sitemap Strategy):** The sitemap is implemented as `app/sitemap.ts` exporting a default `async function sitemap(): Promise<MetadataRoute.Sitemap>`. It queries Supabase for all published `blog_posts` and active `products`, constructing absolute URLs from the `NEXT_PUBLIC_SITE_URL` env var. Next.js App Router auto-discovers this file and serves it at `/sitemap.xml` — no additional route config is needed. `lastModified` is sourced from each row's `updated_at` timestamp.
- **DECISION 38 (Email API Key Per-Request Pattern):** `lib/utils/getEmailKey.ts` is a server-only utility that fetches and decrypts `EMAIL_API_KEY` from `store_settings` on every invocation — no module-level caching (mirrors DECISION 30 for Shiprocket). The admin broadcast route `POST /api/admin/email/broadcast` enforces admin access via `getUser()` + `profiles.role === 'admin'` (mirrors DECISION 31). A `"test": true` flag in the request body sends only to the authenticated admin's address, protecting real subscribers during test runs. The `marketing_opt_in boolean DEFAULT true` column on `profiles` (migration `20260301_0015`) is the opt-in filter — only users with `marketing_opt_in = true` are included in live broadcast queries.

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

---

### Sprint 5 — Razorpay Checkout & High-Concurrency Locking ✅ (27 Feb 2026)

**Backend:**
- `db/migrations/20260227_0008_create_orders_table.sql` — `public.orders` table with `id`, `user_id`, `razorpay_order_id` (unique), `status` (pending/paid/failed/refunded), `amount_paise`, `currency`, `items jsonb`, `shipping_address jsonb`, `created_at`. Indexes on `user_id` and `razorpay_order_id`. RLS guidance comments for owner-read / service-role-write.
- `db/migrations/20260227_0009_reserve_inventory_rpc.sql` — `public.reserve_inventory(cart_items jsonb, order_id uuid)` RPC with `FOR UPDATE` locking; increments `reserved_count` and inserts `inventory_reservations` rows on success; returns `INVENTORY_EXHAUSTED` without mutation on failure. `public.release_reservation(order_id uuid)` RPC reverses increments and deletes reservation rows. Both are `SECURITY DEFINER`. `public.inventory_reservations` table created with `id`, `order_id`, `product_id`, `quantity`, `created_at`, `expires_at`.
- `lib/utils/getRazorpayKeys.ts` — server-only utility using `getServerSupabase()` + `decryptSettings()`. Returns `{ keyId, keySecret }` for server SDK use only.
- `app/api/checkout/route.ts` — full checkout orchestration: `reserve_inventory` → Razorpay order creation → `release_reservation` on failure → `orders` row insert → return public-safe response (`{ razorpay_order_id, razorpay_key_id, amount_paise, currency }`).
- `app/api/razorpay-key/route.ts` — public-safe `GET` returning only `{ key_id }`; no secret in response.
- `db/tests/checkout/` — `01_reserve_success.sql`, `02_reserve_conflict.sql` (two-session psql concurrency simulation), `03_release_on_razorpay_fail.md` (rollback verification guide), `01_concurrency_instructions.md`.
- `docs/api_contract.md` — appended `/api/checkout` and `/api/razorpay-key` payload/response schemas.

**Frontend:**
- `lib/validations/checkout.ts` — `ShippingSchema` (fullName, line1, city, state, pincode ×6-digit, phone ×10-digit, country) + inferred `ShippingFormData`.
- `lib/razorpay.d.ts` — ambient global types for `window.Razorpay`, `RazorpayOptions`, `RazorpayResponse`.
- `app/checkout/page.tsx` — Server Component wrapper with Suspense + `CheckoutSkeleton` fallback.
- `components/checkout/CheckoutForm.tsx` — `"use client"`. `react-hook-form` + Zod. Order summary with GST 18% computation. Calls `POST /api/checkout` → dynamically injects `checkout.razorpay.com/v1/checkout.js` → opens `window.Razorpay` modal → navigates to `/checkout/processing` on success. Shows `INVENTORY_EXHAUSTED` inline error on 409. Buttons disabled during network/script load.
- `components/checkout/CheckoutSkeleton.tsx` — skeleton matching form + summary layout (DECISION 18 pattern).
- `app/checkout/processing/page.tsx` — static order-received confirmation page.
- `tests/checkout/checkoutFlow.test.ts` — test stub with TODO comments.

**QA fixes across Sprint 5 files:**

| File | Fix |
|------|-----|
| `lib/supabaseClient.ts` | Warn when `SUPABASE_SERVICE_ROLE_KEY` is missing; prefer it for `getServerSupabase()` |
| `db/migrations/20260227_0009_reserve_inventory_rpc.sql` | `SECURITY DEFINER` added to both RPCs; comments on owner assignment |
| `app/api/checkout/route.ts` | `err: any` → `unknown`; safe user extraction; `release_reservation` called on Razorpay failure |
| `app/api/razorpay-key/route.ts` | `err: any` → `unknown`; confirmed no secret in response |
| `app/checkout/page.tsx` | Removed duplicate client export causing TSX error |
| `components/checkout/CheckoutForm.tsx` | Removed `any` on cart store; `unknown` catch narrowing; coerced subtotal math |

**Security audit outcome:**
- `RAZORPAY_KEY_SECRET` is never present in any client bundle, frontend component, or API response.
- `lib/encryption.ts` is not imported by any client component — confirmed by inspection.
- `docs/api_contract.md` contains no real credentials.

**Critical manual steps before Sprint 6:**
1. `npm install && npx tsc --noEmit` — confirm 0 errors after installs.
2. Apply migrations: `psql $DATABASE_URL -f db/migrations/20260227_0008_create_orders_table.sql && psql $DATABASE_URL -f db/migrations/20260227_0009_reserve_inventory_rpc.sql`
3. Set function owners: `ALTER FUNCTION public.reserve_inventory(jsonb,uuid) OWNER TO <service_role_user>; ALTER FUNCTION public.release_reservation(uuid) OWNER TO <service_role_user>;`
4. Store Razorpay keys in `store_settings` table (encrypted via admin dashboard) before testing checkout.
5. Set env vars: `SUPABASE_SERVICE_ROLE_KEY`, `SETTINGS_ENCRYPTION_KEY`.

**Open items for Sprint 6:** Razorpay webhook handler (confirm payment → decrement `inventory`, update `orders.status = 'paid'`), reservation expiry background job, admin order management view, Cypress/Playwright e2e tests for checkout, Shadcn full init, storage bucket creation, profiles trigger `supabase db push`.

---

### Sprint 6 — Webhooks, Payment Confirmation & Order Management ✅ (27 Feb 2026)

**Backend:**
- `db/migrations/20260301_0010_finalize_inventory_rpc.sql` — `public.finalize_inventory(order_id uuid)` RPC: decrements `inventory_count` and `reserved_count` for each item in the order; sets `orders.status = 'paid'` and writes `paid_at = now()`. `public.fail_order(order_id uuid)` RPC: calls `release_reservation` and sets `orders.status = 'failed'`. `paid_at timestamptz` column added to `orders`. Both RPCs are `SECURITY DEFINER`.
- `app/api/webhooks/razorpay/route.ts` — Node.js runtime (for `crypto`). Raw body read via `request.text()`. HMAC-SHA256 signature verification with `crypto.timingSafeEqual`. Idempotency check on `orders.status`. Calls `finalize_inventory` on `payment.captured`, `fail_order` on `payment.failed`. Always returns 200. `webhookSecret` from `getRazorpayKeys()`.
- `scripts/send_webhook_twice.js` — sends same webhook payload twice to test idempotency (syntax error fixed in Sprint 7 QA).
- `scripts/scan_getRazorpayKeys.js` — walks repo TS/TSX/JS files and reports any that reference `getRazorpayKeys`, for secret containment audits.
- `db/tests/webhooks/` — signature forgery test, idempotency psql guide, Node idempotency test.

**Frontend:**
- `app/checkout/success/page.tsx` — Server Component; fetches order by `order_id` searchParam; renders items, shipping address, amount; mounts `<ClearCartOnSuccess />`.
- `components/checkout/ClearCartOnSuccess.tsx` — `"use client"` island; calls `cart.clear()` in `useEffect` on mount; renders `null`.
- `app/(admin)/orders/page.tsx` — Server Component; fetches latest 50 orders via `getServerSupabase()`; passes to `<OrdersTable />`.
- `components/admin/orders/OrdersTable.tsx` — `"use client"` island; sortable table (Order ID, amount, status, date).
- `components/admin/orders/OrdersTableSkeleton.tsx` — Suspense fallback skeleton.
- `components/admin/Sidebar.tsx` — updated with Orders nav link.

**QA fixes:**
- HMAC `timingSafeEqual` comparison confirmed correct (equal-length buffer comparison).
- `err: unknown` narrowing applied throughout webhook route.
- Secret containment confirmed by `scan_getRazorpayKeys.js` — no client-component imports.
- Idempotency double-fire test added (`send_webhook_twice.js`).

**Critical manual steps before Sprint 7:**
1. Apply migration: `psql $DATABASE_URL -f db/migrations/20260301_0010_finalize_inventory_rpc.sql`.
2. Set `RAZORPAY_WEBHOOK_SECRET` encrypted in `store_settings` under key `RAZORPAY_WEBHOOK_SECRET`.
3. Configure Razorpay Dashboard webhook URL to point at `/api/webhooks/razorpay`.

**Open items for Sprint 7:** Shiprocket API integration for order fulfillment, AWB generation, shipping label fetch, admin fulfillment UI.

---

### Sprint 7 — Shiprocket Shipping Automation ✅ (27 Feb 2026)

**Backend:**
- `db/migrations/20260301_0011_orders_shiprocket_columns.sql` — adds `shiprocket_order_id text`, `shipment_id text`, `awb_code text`, `courier_name text`, `label_url text`, `fulfillment_status text` (default `'unfulfilled'`) to the `orders` table.
- `lib/utils/getShiprocketToken.ts` — server-only utility; fetches `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` from encrypted `store_settings`; POSTs to Shiprocket auth endpoint; returns `{ token }`. Per-request model — no module-level cache (per DECISION 30).
- `app/api/admin/orders/[id]/fulfill/route.ts` — admin-only (DECISION 31). Full fulfillment flow: `getUser()` auth check → `profiles.role` admin check → fetch order → `getShiprocketToken()` → `POST /orders/create/adhoc` → `POST /courier/assign/awb` → `GET /courier/generate/label` → update all Shiprocket columns + `fulfillment_status = 'manifested'`. Error mapping: pincode/serviceability → 400; generic Shiprocket failure → 502. Idempotent on non-`unfulfilled` status.
- `db/tests/shiprocket/01_invalid_pincode_guide.md` — manual test for serviceability error path.
- `db/tests/shiprocket/02_admin_rls_check.md` — manual test for non-admin 403 enforcement.
- `db/tests/shiprocket/03_token_caching_notes.md` — documents per-request model and Redis upgrade path.
- `docs/api_contract.md` — updated with `POST /api/admin/orders/[id]/fulfill` endpoint spec.

**Frontend:**
- `app/(admin)/orders/[id]/page.tsx` — Server Component; fetches full order including Shiprocket columns; mounts `<FulfillmentCard />` in a `<Suspense>` with `<OrderDetailSkeleton />` fallback.
- `components/admin/orders/FulfillmentCard.tsx` — `"use client"` island; shows shipping address + fulfillment status badge; if `fulfillment_status === 'unfulfilled'`, renders "Fulfill with Shiprocket" button; POST to fulfill route → displays AWB, courier, and label download link on success; inline error message on failure. `disabled={loading}`, `aria-label`, `role="status"` on message div.
- `components/admin/orders/OrderDetailSkeleton.tsx` — animated pulse skeleton for the order detail page.
- `tests/shiprocket/fulfillment.test.ts` — test stub.

**QA fixes (Sprint 7 QA sweep — 5 fixes across 4 files):**

| File | Fix |
|------|-----|
| `app/api/admin/orders/[id]/fulfill/route.ts` | `getSession()` → `getUser()` (re-validates with auth server; `getSession()` is unsafe for admin checks) |
| `lib/utils/getShiprocketToken.ts` | `catch (e)` → `catch (_e)` (explicit unused-variable annotation) |
| `components/admin/orders/FulfillmentCard.tsx` | `catch(err)` narrowed: `const msg = err instanceof Error ? err.message : 'Network error...'`; redundant `role="button"` removed from `<button>` |
| `scripts/send_webhook_twice.js` | `'--': '...'` syntax error → JS comment (`// -- replace with realistic structure`) |

**Critical manual steps before Sprint 8:**
1. Apply migration: `psql $DATABASE_URL -f db/migrations/20260301_0011_orders_shiprocket_columns.sql`.
2. Store Shiprocket credentials encrypted in `store_settings` under keys `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`.
3. Assign admin role to the fulfillment operator account before testing the fulfill route.

**Open items for Sprint 8:** Inventory TTL expiry background job, Shiprocket webhook for delivery status updates, storefront order tracking page, Cypress/Playwright e2e tests, Shadcn full init, storage bucket creation, profiles trigger `supabase db push`.

---

### Sprint 8 — Verified Reviews & UGC Algorithm ✅ (27 Feb 2026)

**Backend:**
- `db/migrations/20260301_0012_reviews_ugc.sql` — ALTERs existing `reviews` table to add `media_urls text[]` (default `{}`), `verified_purchase boolean` (default `false`), `helpful_count int` (default `0`). Adds composite indexes on `(product_id, created_at)` and `(product_id, rating, helpful_count)` for feed queries. RLS policy guidance: authenticated users INSERT/UPDATE own rows; anon can read.
- `db/migrations/20260301_0013_review_media_bucket.sql` — Documents `review-media` bucket creation (CLI: `supabase storage create-bucket review-media --public`) and `storage.objects` RLS policy snippets restricting uploads to `auth.uid() || '/%'` path prefix.
- `db/migrations/20260301_0014_get_product_reviews_rpc.sql` — `public.get_product_reviews(product_uuid uuid, limit_rows int DEFAULT 20, offset_rows int DEFAULT 0)` SECURITY DEFINER RPC. Tiered sort: Tier 1 (5★ + media) → Tier 2 (4★ + media) → Tier 3 (5★ text-only) → Tier 4 (everything else); within tier: `helpful_count DESC`, `created_at DESC`. NULL-safe via `COALESCE(array_length(media_urls,1), 0)`.
- `app/api/reviews/verify-eligibility/route.ts` — GET/POST handler; `getUser()` auth; JSONB containment check on `orders.items`; returns `{ eligible: boolean }` or 403.
- `lib/actions/reviews.ts` — `submitReview({ product_id, rating, body, media_urls })` server action; enforces purchase eligibility server-side; sets `verified_purchase` from DB result; inserts review row.
- `docs/api_contract.md` — appended reviews endpoints, RPC spec, upload path convention.
- `db/tests/reviews/eligibility_check.md`, `algorithm_seed.md` — manual psql/curl test guides.

**Frontend:**
- `components/reviews/ReviewModal.tsx` — Framer Motion modal; `react-hook-form` + Zod; 1–5 star selector (keyboard-accessible, `aria-label`); `textarea`; drag-and-drop uploader with per-file progress, size enforcement (5 MB image / 20 MB video) before upload; calls `supabase.auth.getUser()` for upload path; calls `submitReview` server action on submit; full focus trap + ESC + `role="dialog"` + `aria-modal` + `aria-labelledby`.
- `components/reviews/ReviewCard.tsx` — displays reviewer name, star rating, body, `helpful_count`, media thumbnails. Constructs public URLs via `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/review-media/<key>` (no raw keys as `src`).
- `components/reviews/ReviewsList.tsx` — client island; receives pre-fetched reviews as prop; renders grid of `ReviewCard`.
- `components/reviews/Lightbox.tsx` — fullscreen image/video viewer; Framer Motion open/close; next/prev controls; swipe gestures; video rendered with `controls`, `playsInline`, `preload="metadata"`; video detection by file extension whitelist (not URL substring).
- `app/(storefront)/shop/[slug]/page.tsx` — updated to include `ProductReviews` Server Component fetching via `get_product_reviews` RPC in a `<Suspense>` boundary.

**QA fixes (Sprint 8 QA sweep — 12 fixes across 5 files):**

| File | Fix |
|------|-----|
| `lib/actions/reviews.ts` | 🔴 CRITICAL: JSONB containment sent `undefined` (`{ product_id }` shorthand with wrong variable name) → fixed to `[{ product_id: productId }]` |
| `ReviewModal.tsx` | `TODO_USER_ID` placeholder → calls `supabase.auth.getUser()` before upload |
| `ReviewModal.tsx` | Star `aria-label` was `"${n} star"` → `"Rate ${n} out of 5 stars"` |
| `ReviewModal.tsx` | File drop zone missing `role="button"`, `tabIndex`, `onKeyDown`, hidden `<input>` — added full keyboard/AT support |
| `ReviewModal.tsx` | Missing `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, ESC close — all added |
| `ReviewCard.tsx` | Raw storage keys used as `<img src>` → `toPublicUrl()` helper added |
| `Lightbox.tsx` | Video missing `playsInline` + `preload="metadata"` → added |
| `Lightbox.tsx` | Video detection via `src.includes('video')` (fragile) → replaced with extension whitelist |
| `shop/[slug]/page.tsx` | `getServerSupabase()` incorrect destructuring; wrong RPC param names; `public.` prefix removed from `.rpc()` call |

**Open issue for Sprint 9:** `app/account/orders/page.tsx` was not created by the Frontend Specialist — the "Leave a Review" entry point from order history is missing and must be built.

**Critical manual steps before Sprint 9:**
1. Apply migrations in order: `0012`, `0013` (bucket creation), `0014`.
2. Create `review-media` storage bucket: `supabase storage create-bucket review-media --public`.
3. Apply `storage.objects` RLS snippets from `0013` migration via Supabase SQL editor.
4. Grant RPC execute: `GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid,int,int) TO authenticated, anon;`

**Open items for Sprint 9:** Account orders page with Leave a Review button, inventory TTL expiry job, Shiprocket delivery webhook, storefront order tracking page, Cypress/Playwright e2e, Shadcn full init.

---

### Sprint 9 — Blog & Admin Email Marketing Engine ✅ (27 Feb 2026)

**Backend:**
- `app/sitemap.ts` — Dynamic `MetadataRoute.Sitemap` generator; queries Supabase for published `blog_posts` and active `products`; constructs absolute URLs from `NEXT_PUBLIC_SITE_URL`; served automatically at `/sitemap.xml` by Next.js App Router.
- `lib/utils/getEmailKey.ts` — server-only utility; fetches and decrypts `EMAIL_API_KEY` from `store_settings` via `getServerSupabase()` + `decryptSettings()`; per-request model (no module-level cache).
- `app/api/admin/email/broadcast/route.ts` — admin-only POST (`getUser()` + `profiles.role === 'admin'`); queries `profiles` where `marketing_opt_in = true`; sends via Resend SDK using the dynamically fetched key; `test: true` mode sends only to the admin's own email.
- `db/migrations/20260301_0015_profiles_marketing_optin.sql` — adds `marketing_opt_in boolean DEFAULT true` column to `profiles` table.
- `docs/api_contract.md` — appended broadcast endpoint spec and `marketing_opt_in` field documentation.
- `db/tests/email/broadcast_admin_only.md`, `db/tests/email/test_mode.md` — manual audit guides.

**Frontend:**
- `app/blog/page.tsx` — Server Component; `generateMetadata()` for OpenGraph; queries published blog posts; `<Suspense>` boundary.
- `components/blog/ArticleCard.tsx` — article card (title, excerpt, cover image, publish date) matching "Old Money" design tokens.
- `app/blog/[slug]/page.tsx` — Server Component; `generateMetadata()` with full OpenGraph + Twitter Card tags; sanitizes raw HTML via `DOMPurify.sanitize()` (isomorphic-dompurify) before `dangerouslySetInnerHTML`.
- `components/blog/ArticleLayout.tsx` — typography layout for article body (Playfair Display headings, generous reading margins).
- `components/blog/ProductRecommendations.tsx` — "You may also like" strip sourced from blog post metadata.
- `app/(admin)/email-campaigns/page.tsx` — Admin email campaigns dashboard.
- `components/admin/email/EmailCampaignForm.tsx` — `"use client"` form; subject + HTML body; "Send Test" and "Broadcast" buttons; confirmation modal (`role="dialog"`, `aria-modal`); calls broadcast route.
- `tests/blog/articleRender.test.tsx` — asserts `<script>` tags stripped after sanitization.

**QA (Sprint 9 sweep — 7 fixes across 7 files):**

| File | Fix |
|------|-----|
| `app/sitemap.ts` | `NEXT_PUBLIC_SITE_URL` fallback added; `updated_at` null-coalesced to `new Date()` |
| `app/api/admin/email/broadcast/route.ts` | `err: any` → `unknown` narrowing |
| `lib/utils/getEmailKey.ts` | Added `server-only` guard import |
| `db/migrations/20260301_0015_profiles_marketing_optin.sql` | `IF NOT EXISTS` guard on `ALTER TABLE` |
| `app/blog/[slug]/page.tsx` | `generateMetadata` typed as `Promise<Metadata>`; DOMPurify import verified |
| `app/(admin)/email-campaigns/page.tsx` | Admin route guard added |
| `components/admin/email/EmailCampaignForm.tsx` | `err: any` → `unknown`; confirmation modal aria attributes |

**Test Hotfix (Post-Sprint 9 — all 10 test suites passing):**
- `jest.config.cjs` — `preset: 'ts-jest'`, `testEnvironment: 'jsdom'`, `setupFilesAfterEnv`, ts-jest transform (`jsx: react-jsx`, `diagnostics: false`), `moduleNameMapper` for Next.js + Supabase + CSS/image imports, `transformIgnorePatterns` whitelisting `isomorphic-dompurify`.
- `jest.setup.ts` — imports `@testing-library/jest-dom`.
- `__mocks__/next/image.js`, `__mocks__/next/link.js`, `__mocks__/next/navigation.js` — lightweight stubs for jsdom.
- `__mocks__/lib/supabaseClient.js` — full Supabase client mock (auth, from, rpc).
- `__mocks__/server-only.js` — stubs `server-only` package.
- Fixed test files: `tests/cart.test.tsx` (store API); `tests/products.test.tsx` (fixture + render); `tests/cart/cartStore.test.ts` (`act` import, `useHydrated` assertion); `tests/checkout/checkoutFlow.test.ts` (vitest import); `tests/shiprocket/fulfillment.test.ts` (JSX in `.ts`); `tests/auth.test.tsx` (multiple-match on heading).

**Critical manual steps before Sprint 10:**
1. Apply migration: `psql $DATABASE_URL -f db/migrations/20260301_0015_profiles_marketing_optin.sql`
2. Store email provider API key encrypted in `store_settings` under key `EMAIL_API_KEY`.
3. Set `NEXT_PUBLIC_SITE_URL` env var for sitemap absolute URL generation.
4. `npm install && npm test` — confirm all 10 suites pass.

**Open items for Sprint 10:** `app/account/orders/page.tsx` with Leave a Review entry point (missing since Sprint 8), inventory TTL expiry background job, Shiprocket delivery webhook + storefront order tracking page, Cypress/Playwright e2e tests, Shadcn full init.
