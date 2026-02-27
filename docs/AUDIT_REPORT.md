# Sprint 11 — Global Repository Audit Report
*Generated: 27 February 2026 | Phase 1 of Sprint 11 (Hardening & Polish)*
*Static analysis confirmed via VS Code TypeScript Language Server.*

---

## Summary Scorecard

| Tier | Count | Status |
|------|-------|--------|
| **Tier 1 — Build-Breaking Blockers** | **14** | ❌ Must fix before any deployment |
| **Tier 2 — Type Mismatches & Contract Violations** | **11** | ⚠️ Fix in Phase 3 Batch 2 |
| **Tier 3 — Dead Code, Console Logs, TODOs** | **17** | 🔶 Fix in Phase 3 Batch 3 |
| **Known Feature Gaps (not yet built)** | **5** | 🔵 Fix in Phase 2 |

---

## TIER 1 — Build-Breaking Blockers

These cause 404s, runtime crashes, or module-not-found errors. **Fix before `npm run build`.**

### T1-01: `app/page.tsx` — HOMEPAGE MISSING
- **File:** `app/page.tsx` — does not exist
- **Impact:** Root `/` URL returns a Next.js 404. The site has no landing page.
- **Fix:** Create `app/page.tsx` as the storefront homepage (hero, featured drops, product highlights).

### T1-02: `app/account/orders/page.tsx` — ORDERS PAGE MISSING
- **File:** `app/account/orders/page.tsx` — does not exist
- **Impact:** The `/account/orders` URL 404s. "Leave a Review" entry point from order history is unreachable. Flagged since Sprint 8.
- **Fix:** Create orders list page with review entry points (Phase 2 Frontend task).

### T1-03: `app/api/admin/email/broadcast/route.ts` — MODULE NOT FOUND
- **File:** `app/api/admin/email/broadcast/route.ts` L1
- **Bad import:** `import { getServerSupabase } from 'lib/supabase-server'`
- **Impact:** `lib/supabase-server.ts` does not exist. This route crashes at import time with module-not-found.
- **Fix:** Change to `import { getServerSupabase } from '../../../../lib/supabaseClient'`

### T1-04: `app/blog/page.tsx` — MODULE NOT FOUND + ASYNC BUG
- **File:** `app/blog/page.tsx` L3, L22
- **Bad import:** `import { getServerSupabase } from 'lib/supabase/getServerSupabase'`
- **Additional bug L22:** `const { supabase } = await getServerSupabase()` — function is synchronous and returns client directly, not `{ supabase }`.
- **Impact:** Module not found at build time. Even if fixed, double contract violation (async + destructure).
- **Fix:** `import { getServerSupabase } from '../../lib/supabaseClient'`; change L22 to `const supabase = getServerSupabase()`.

### T1-05: `app/api/reviews/verify-eligibility/route.ts` — MODULE NOT FOUND + DESTRUCTURE BUG
- **File:** `app/api/reviews/verify-eligibility/route.ts` L3, L8, L36
- **Bad import:** `import { getServerSupabase } from '../../../../lib/supabase'`
- **Additional bug L8, L36:** `const { supabase } = getServerSupabase()` — client returned directly, not `{ supabase }`.
- **Impact:** Module not found + all calls to `supabase.from(...)` yield `undefined.from(...)`.
- **Fix:** Fix import to `'../../../../lib/supabaseClient'`; change destructure to `const supabase = getServerSupabase()`.

### T1-06: `lib/actions/reviews.ts` — MODULE NOT FOUND + DESTRUCTURE BUG
- **File:** `lib/actions/reviews.ts` L1, L13, L36
- **Bad import:** `import { getServerSupabase } from '../supabase'`
- **Additional bug L13, L36:** `const { supabase } = getServerSupabase()` — same contract violation.
- **Impact:** Every call to `submitReview()` (review modal, review form) crashes at module load. Review submission is completely broken.
- **Fix:** Fix import to `'../supabaseClient'`; change all destructures to `const supabase = getServerSupabase()`.

### T1-07: `app/(storefront)/shop/[slug]/page.tsx` L129 — DESTRUCTURE BUG
- **File:** `app/(storefront)/shop/[slug]/page.tsx` L129
- **Bug:** `const { supabase } = getServerSupabase()` — TypeScript compile error confirmed by static analysis: *"Property 'supabase' does not exist on type 'SupabaseClient<Database...>'"*
- **Impact:** `ProductReviews` server component always throws at runtime. Product detail page reviews are broken.
- **Fix:** `const supabase = getServerSupabase()`

### T1-08: `app/api/admin/email/broadcast/route.ts` L11 — DESTRUCTURE BUG
- **File:** `app/api/admin/email/broadcast/route.ts` L11
- **Bug:** `const { supabase } = getServerSupabase()` — same contract violation (compounds T1-03).
- **Fix:** `const supabase = getServerSupabase()` (after T1-03 import fix).

### T1-09: `app/(storefront)/products/page.tsx` — WRONG CLIENT, DEAD STUB
- **File:** `app/(storefront)/products/page.tsx` L5, L9
- **Bugs:**
  - `import getServerSupabase from '../../../lib/supabaseClient'` — default export is the **browser anon-key client object**, not the server factory.
  - `const supabase = getServerSupabase` — function reference assigned, never called; all subsequent `.from()` calls invoke a method on a function object.
  - Local `ProductListItem` type duplicates and diverges from `lib/actions/catalog.ts`.
- **Impact:** This page does not function. Products are never loaded. Using anon client in a Server Component bypasses service-role data access patterns.
- **Fix:** Rewrite to use `getPublishedProducts()` from `lib/actions/catalog.ts`. Delete local type. This page is a dead stub of the correct `app/(storefront)/shop/` implementation.

### T1-10: `app/(storefront)/products/[slug]/page.tsx` — WRONG CLIENT + `select('*')` VIOLATION
- **File:** `app/(storefront)/products/[slug]/page.tsx` L10, L~25
- **Bugs:** Same wrong-client pattern as T1-09. Additionally `select('*')` exposes **all columns** including `cost_price` and `internal_notes` to the client.
- **Impact:** Security violation (DECISION 16) + broken page (wrong client). This route is a broken duplicate of `app/(storefront)/shop/[slug]/page.tsx`.
- **Fix:** Either (a) delete this route and redirect via `next.config.ts` if legacy URLs use `/products/[slug]`, or (b) rewrite to use `getProductBySlug()` from catalog actions.

### T1-11: `lib/actions/catalog.ts` L9–11 — MODULE-LEVEL THROW ON MISSING ENV VARS
- **File:** `lib/actions/catalog.ts` L9–11
- **Bug:** `if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { throw new Error(...) }` at module level.
- **Impact:** Any CI/CD build environment, Vercel preview build, or GitHub Actions run that doesn't inject secrets will crash the entire Next.js build at import time.
- **Fix:** Replace with `console.warn(...)` to match the pattern in `lib/supabaseClient.ts`, or move the guard inside each action function body.

### T1-12: `tests/auth.test.tsx` L14, L19 — `toBeInTheDocument` COMPILE ERRORS (CONFIRMED BY STATIC ANALYSIS)
- **File:** `tests/auth.test.tsx` L14, L19
- **Error:** `Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'` — confirmed by VS Code static analysis.
- **Impact:** Test suite fails to compile; jest reports type errors.
- **Fix:** Replace `toBeInTheDocument()` with `toBeTruthy()` (already applied in Sprint 10 QA for `auth.test.tsx` — check if the edit was saved or if the file was reverted).

### T1-13: `app/(storefront)/shop/[slug]/page.tsx` L87, L137 — STALE `@ts-expect-error` (CONFIRMED BY STATIC ANALYSIS)
- **File:** `app/(storefront)/shop/[slug]/page.tsx` L87, L137
- **Error:** `Unused '@ts-expect-error' directive` — confirmed by VS Code static analysis. With `strict: true`, stale directives themselves become compile errors.
- **Fix:** Remove both `// @ts-expect-error` comment lines.

### T1-14: `app/api/webhooks/shiprocket/route.ts` — DOES NOT EXIST
- **File:** `app/api/webhooks/shiprocket/route.ts` — does not exist
- **Impact:** Shiprocket delivery status webhooks have no inbound handler. No order is ever auto-marked `delivered`. Customers have no way to see delivery confirmation from Shiprocket events.
- **Fix:** Build in Phase 2 (Backend task).

---

## TIER 2 — Type Mismatches & API Contract Violations

Fix in Phase 3 Batch 2, after all Tier 1 blockers are resolved.

### T2-01: Duplicate `Database` type — `types/api.ts` vs `lib/supabaseClient.ts`
- `types/api.ts` exports a full `Database` type with `Insert`/`Update`/`Enums` shapes.
- `lib/supabaseClient.ts` defines its own `Database` (Row-only, no Insert/Update).
- Some files import one, some the other. Structural divergence is invisible at runtime but breaks strict generic inference.
- **Fix:** Delete the inline `Database` from `lib/supabaseClient.ts`; re-export from `types/api`.

### T2-02: `product_variants` table not in `Database` type or any migration
- `lib/actions/catalog.ts` queries `supabaseAdmin.from('product_variants')` but no migration, no type declaration, and no `product_variants` entry in either `Database` type exists.
- Supabase-js falls back to `any` for unknown tables.
- **Fix:** Add `product_variants` to `Database` type in `types/api.ts` with proper shape; confirm migration exists.

### T2-03: `app/api/webhooks/razorpay/route.ts` L72 — field `status` not in `Order` type
- Queries `.select('id, status')` but `Order` interface has `fulfillment_status`, not `status`.
- Either the DB column name and TS type are mismatched, or the select string is wrong.
- **Fix:** Audit DB schema. Align `Order` type field name with actual DB column.

### T2-04: `app/api/admin/email/broadcast/route.ts` L53, L56 — `any` casts on typed Supabase results
```ts
recipients = r1.data.filter((r: any) => r?.email).map((r: any) => ({ email: r.email }))
```
- Supabase query result types are fully known from the `Database` generic. The `any` casts bypass this.
- **Fix:** Remove `any`; use the proper `profiles` Row type from `Database`.

### T2-05: `app/api/checkout/route.ts` L26 — `as any` cast on `getUser()` result
```ts
const user = (userRes as any)?.data?.user ?? null
```
- `supabase.auth.getUser()` is fully typed; the cast is unnecessary and defeats type checking.
- **Fix:** Remove `as any`; use the typed return `const { data: { user } } = await supabase.auth.getUser()`.

### T2-06: `middleware.ts` — manual cookie parsing instead of `@supabase/ssr` client
- Middleware manually extracts `sb:token` / `supabase-auth-token` cookies and passes raw JWT to `getUser(token)`.
- The canonical Next.js 15 pattern is `createServerClient` from `@supabase/ssr` which handles cookie refresh, rotation, and the `Set-Cookie` response header automatically.
- **Fix (Phase 3):** Replace with `@supabase/ssr createServerClient` middleware pattern.

### T2-07: `app/api/chat/route.ts` — `Map` state incompatible with `export const runtime = 'edge'`
- Module-level `Map<string, number[]>` for rate limiting is reset on every Edge cold start and is NOT shared across Edge replicas. This negates the rate limiter's effectiveness in production.
- Documented as DECISION 40 but escalated here because it is an architectural contract violation.
- **Fix (Phase 2 or as addendum):** Migrate to a Supabase KV or Redis-backed counter, OR change runtime to `nodejs` and use a request-scoped Redis call.

### T2-08: `components/chat/ChatMessages.tsx` — hardcoded hex values violate DECISION 15
- Line ~25: `bg-[#041526]` should be `bg-navy`; `text-[#F8F4EC]` should be `text-ivory`.
- **Fix:** Replace with Tailwind design tokens.

### T2-09: `components/chat/SuggestionChips.tsx` L13 — hardcoded hex violates DECISION 15
- `text-[#041526]` should be `text-navy`.
- **Fix:** Replace with `text-navy`.

### T2-10: `components/chat/ChatWidget.tsx` — inline hex values for Framer Motion styles
- Framer Motion `style` props use hex strings (`#041526`, `#F8F4EC`, `#D4AF37`) because Tailwind tokens aren't available in JS runtime. This was acknowledged during Sprint 10 as unavoidable for animation values.
- **Status:** Accepted workaround. Document in component JSDoc. Not a hard block.

### T2-11: `app/(storefront)/products/page.tsx` — local `ProductListItem` type diverges from `catalog.ts`
- Local type uses `image?: string | null` and `drop_active?: boolean | null` which don't match DB schema or catalog action return shape.
- Moot once T1-09 is resolved (page rewrite). Flagged here for tracking.

---

## TIER 3 — Dead Code, Console Logs & Cosmetic Debt

Fix in Phase 3 Batch 3, after Tier 1 and 2 are clean.

| ID | File | Line | Issue |
|----|------|------|-------|
| T3-01 | `app/(storefront)/shop/[slug]/page.tsx` | ~138 | `console.error('reviews fetch error', err)` — use structured logger or silent fail |
| T3-02 | `app/blog/page.tsx` | 30 | `console.error('Failed to load blog posts', error)` |
| T3-03 | `app/api/reviews/verify-eligibility/route.ts` | 22, 28 | Two `console.error` calls in catch blocks |
| T3-04 | `lib/actions/reviews.ts` | 19, 25 | Two `console.error` calls in catch blocks |
| T3-05 | `components/chat/ChatInput.tsx` | 67 | `console.error('[ChatInput] submit error', ...)` ships to client bundle |
| T3-06 | `app/api/admin/email/broadcast/route.ts` | ~117, ~118 | Two `// TODO:` comments — batch sends, secure runtime |
| T3-07 | `tests/auth.test.tsx` | 2, 21 | Two `// TODO:` comments — entire file is annotated as non-functional |
| T3-08 | `components/ui/badge.tsx` + `components/ui/Badge.tsx` | — | Duplicate file (lowercase + PascalCase). Same implementation. One must be deleted. |
| T3-09 | `app/(storefront)/products/page.tsx` | — | Entire file is a dead broken stub (also Tier 1). Candidate for deletion once T1-09 resolved. |
| T3-10 | `app/(storefront)/products/[slug]/page.tsx` | — | Entire file is a dead broken stub (also Tier 1). Candidate for deletion once T1-10 resolved. |
| T3-11 | `tests/auth.test.tsx` | 14, 19 | `toBeInTheDocument` (also Tier 1 T1-12) |

---

## Shadcn UI Initialization Gap Analysis

| Check | Result |
|-------|--------|
| `components.json` | ❌ **MISSING** — `npx shadcn-ui@latest init` was never run |
| `app/globals.css` Shadcn CSS vars | ❌ **MISSING** — No `--background`, `--foreground`, `--primary`, `--ring`, `--radius`, etc. Only Tailwind base layers + Google Fonts |
| `tailwind.config.ts` Shadcn preset | ❌ **MISSING** — No `darkMode: ["class"]`, no `tailwindcss-animate` plugin, no `content` paths for Shadcn |
| `components/ui/` Radix primitives | ❌ **ALL STUBS** — `button.tsx`, `dialog.tsx`, `input.tsx`, `badge.tsx` are hand-written Tailwind components with no Radix UI, no CVA, no `cn()` utility |
| Missing critical UI components | ❌ `Sheet`, `Toast`, `DropdownMenu`, `Select`, `Popover`, `Skeleton`, `Tabs`, `Label`, `Form`, `Separator` — all absent |
| Brand tokens in `tailwind.config.ts` | ✅ Custom `cream/navy/gold/charcoal/stone/ivory/forest` colors present — must be preserved during Shadcn init |

**Shadcn Init Strategy for Phase 2:**
1. Run `npx shadcn-ui@latest init` with `--force` to generate `components.json`.
2. Choose CSS variables style. Map `--primary` → gold, `--background` → cream, `--foreground` → charcoal, `--card` → ivory, `--accent` → forest.
3. Add CSS variable block to `app/globals.css` (both `:root` and `.dark`).
4. Add `darkMode: ["class"]` and `tailwindcss-animate` to `tailwind.config.ts` without removing existing brand tokens.
5. Run `npx shadcn-ui@latest add button dialog input badge sheet toast dropdown-menu select skeleton tabs label separator`.
6. Verify existing hand-written stubs don't conflict; delete duplicates.

---

## Known Feature Gaps (Not Yet Built)

These are confirmed absent in the codebase. All are Phase 2 tasks.

| Gap | Phase | Specialist |
|-----|-------|------------|
| `app/api/webhooks/shiprocket/route.ts` — delivery status inbound webhook | Phase 2 | Backend |
| `pg_cron` job (or Supabase Edge Function) for inventory TTL expiry — releases `reserved_count` on stale `pending` orders > 15 min | Phase 2 | Backend |
| `app/account/orders/page.tsx` — customer order history + Leave a Review entry points | Phase 2 | Frontend |
| `/track` page — public order tracking (Order ID + Email → Shiprocket status) | Phase 2 | Frontend |
| Playwright e2e test suite — `playwright.config.ts` + `tests/checkout.spec.ts` | Phase 4 | QA |

---

## Test Coverage Gaps

| Feature / Module | Test File | Status |
|-----------------|-----------|--------|
| Auth UI (`LoginModal`, `RegisterModal`) | `tests/auth.test.tsx` | EXISTS but broken (T1-12) |
| Chat API route | — | **NO TEST** |
| Catalog server actions | — | **NO TEST** |
| Cart store (Zustand) | — | **NO TEST** |
| Cart validation RPC | — | **NO TEST** |
| Checkout API flow | — | **NO TEST** |
| Review submission action | — | **NO TEST** |
| Review eligibility check | — | **NO TEST** |
| Razorpay webhook | — | **NO TEST** |
| Order fulfillment route | — | **NO TEST** |
| Email broadcast route | — | **NO TEST** |
| Middleware admin guard | — | **NO TEST** |
| E2E: checkout flow | — | **NO E2E FRAMEWORK** |
| E2E: limited drop purchase | — | **NO E2E FRAMEWORK** |

---

## Migration Completeness

**Finding:** The `db/migrations/` directory contains no discoverable SQL migration files at any standard naming convention. Either migrations are managed exclusively via the Supabase Dashboard (not committed), or the directory uses an undiscovered convention.

| Object | Expected Migration | Status |
|--------|-------------------|--------|
| `profiles`, `products`, `orders`, etc. (core schema) | Sprint 1 migrations | **NOT FOUND in repo** |
| `inventory_reservations` table | Sprint 5 | **NOT FOUND** |
| `product_variants` table | Unknown | **NOT FOUND** (also referenced in `catalog.ts` without a type) |
| Inventory TTL expiry `pg_cron` job | Sprint 11 | **NOT BUILT** |
| All RPCs (`validate_cart`, `reserve_inventory`, `get_product_reviews`, etc.) | Sprints 3–8 | **NOT FOUND** |

**Action Required:** Before Phase 2, confirm whether migrations are in Supabase Dashboard only or if there is a folder path not yet scanned. If Dashboard-only, create a `db/schema_dump.sql` baseline for reproducibility.

---

## Phase 2 Execution Plan (Preview)

Once you type **'Approved'**, the following will be delegated:

**Backend Specialist:**
1. Fix all Tier 1 import/destructure bugs (T1-03 through T1-11)
2. Build `app/api/webhooks/shiprocket/route.ts` with signature verification + order status update
3. Write `pg_cron` inventory TTL expiry SQL (or Supabase Edge Function cron)
4. Add `db/migrations/` baseline dump (or document Dashboard-only pattern)

**Frontend Specialist:**
1. Create `app/page.tsx` storefront homepage (T1-01)
2. Create `app/account/orders/page.tsx` with Leave a Review entry points (T1-02)
3. Create `app/(storefront)/track/page.tsx` — public order tracking page
4. Run Shadcn init + add required components + preserve brand tokens
5. Fix `app/(storefront)/products/page.tsx` and `products/[slug]/page.tsx` or delete dead stubs (T1-09, T1-10)

---

## Phase 2 Delivery — QA Code Review (27 February 2026)

*Files reviewed: `app/page.tsx`, `components/home/HeroSection.tsx`, `app/account/orders/page.tsx`, `components/account/OrdersList.tsx`, `components/account/OrdersPageSkeleton.tsx`, `app/track/page.tsx`, `components/track/OrderTracker.tsx`, `lib/utils.ts`, `components.json`*
*Reference contracts used: `types/api.ts`, `types/cart.ts`, `lib/actions/catalog.ts` (first 30 lines), `store/cartStore.ts`, `components/reviews/ReviewModal.tsx` (first 20 lines)*

---

### `app/account/orders/page.tsx`

**[SEVERITY: CRITICAL]** `app/account/orders/page.tsx:8` — `getServerSupabase()` creates a plain `createClient` with the service-role key and **no cookie adapter**. Calling `supabase.auth.getUser()` on this client (line 11–13) without an explicit JWT always resolves `{ data: { user: null } }` because there is no `@supabase/ssr` cookie reader attached. The result: the `if (!user) redirect('/')` guard on line 15 fires for **every** authenticated visitor, making the orders page permanently unreachable. Fix: replace the manual client with `@supabase/ssr createServerClient` that reads `cookies()` from `next/headers`, consistent with the middleware pattern in `middleware.ts`.

**[SEVERITY: HIGH]** `app/account/orders/page.tsx:1` — The page has no `export const dynamic = 'force-dynamic'` directive. Because it contains per-user data, Next.js may attempt to statically cache it at build time. A cached response would incorrectly serve one user's session check result to all users. Fix: add `export const dynamic = 'force-dynamic'` as the first export in the file.

**[SEVERITY: HIGH]** `app/account/orders/page.tsx:20–26` — `getServerSupabase()` uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses Row Level Security entirely. Even if the cookie bug (above) is fixed, querying orders with the service-role client and a manually added `.eq('user_id', user.id)` filter relies solely on application-level filtering — a single typo or future refactor removing that clause would expose all orders in the table to any authenticated user. Fix: use the anon-key `@supabase/ssr` client so the DB-enforced RLS policy on `orders` acts as the authoritative guard.

**[SEVERITY: MEDIUM]** `app/account/orders/page.tsx:22` — `orders as Order[]` is an unsafe type cast. The Supabase client's inferred return type for the partial `.select(...)` does not match the full `Order` interface (e.g., `items` is typed `Json | null` in the generated schema, while `Order.items` is `Record<string, unknown>[] | null`). Casting suppresses this mismatch. Fix: define a narrow `OrderRow` type that matches exactly the columns selected, or validate the shape before casting.

---

### `components/account/OrdersList.tsx`

**[SEVERITY: CRITICAL]** `components/account/OrdersList.tsx:181–187` — `ReviewModal` is rendered missing its required `open` prop and with an undeclared `productName` prop. The `ReviewModal` interface (confirmed in `components/reviews/ReviewModal.tsx:10–14`) is:
```ts
type Props = { productId: string; open: boolean; onClose: () => void }
```
The call site is:
```tsx
<ReviewModal
  productId={reviewTarget.productId}
  productName={reviewTarget.productName}   // ❌ not in Props — TypeScript error
  onClose={() => setReviewTarget(null)}
  // ❌ `open` is missing — ReviewModal will always render as closed
/>
```
Both issues together mean: the modal TypeScript-errors at compile time **and**, if the error is suppressed, the modal never opens because `open` will be `undefined` (falsy). Fix: add `open={true}` (or `open={reviewTarget !== null}`) and remove `productName` from the call site. If `productName` is needed inside the modal, add it to `ReviewModal`'s `Props` interface.

**[SEVERITY: MEDIUM]** `components/account/OrdersList.tsx:100–105` — The expand/collapse button has no `aria-expanded` attribute, so screen readers cannot announce the current state. Fix: add `aria-expanded={expanded}` to the button element.

**[SEVERITY: MEDIUM]** `components/account/OrdersList.tsx:138–145` — Each "Leave a Review" button has the visible label `"Leave a Review"` with no additional context. When a page contains multiple orders with multiple line items, a screen reader's button list will contain several identically-named "Leave a Review" elements. Fix: add `aria-label={`Leave a review for ${item.product_name ?? 'this product'}`}` to each button.

**[SEVERITY: LOW]** `components/account/OrdersList.tsx:75` — `order.items ?? null` passes `undefined | Record<string,unknown>[] | null` → `Record<string,unknown>[] | null` to `parseItems`. The `?? null` coalesces `undefined` → `null`, then `parseItems` guards on `!raw`. This is safe but verbose — the guard inside `parseItems` already handles `null`; the outer `?? null` is redundant. No runtime impact.

---

### `components/account/OrdersPageSkeleton.tsx`

**[SEVERITY: MEDIUM]** `components/account/OrdersPageSkeleton.tsx:1` — The skeleton container has no ARIA loading semantics. Screen readers will announce the placeholder divs as empty content with no indication that data is loading. Fix: add `aria-busy="true"` and `aria-label="Loading your orders"` to the outermost `<div>`.

**[SEVERITY: LOW]** `components/account/OrdersPageSkeleton.tsx:7` — `bg-stone/15` uses opacity fraction `15`. Tailwind v3 JIT supports arbitrary opacity values, so this compiles, but it is not on the standard opacity scale (`/10`, `/20`, `/25`) used elsewhere in the codebase. If the project ever moves to a content-hash or static Tailwind build without JIT, `bg-stone/15` would be purged. Low risk; standardise to `bg-stone/10` or `bg-stone/20` for consistency.

---

### `app/page.tsx`

**[SEVERITY: HIGH]** `app/page.tsx:12–20` — `NewArrivalsGrid` renders with no empty-state guard. If `getPublishedProducts()` returns `[]` (e.g., all products are `inactive`, or the catalog is fresh), the section renders the `<h2>"New Arrivals"</h2>` heading above an empty grid — a blank white area. Fix: add `if (!products.length) return <p className="font-sans text-stone">No products available yet.</p>` before the grid return.

**[SEVERITY: LOW]** `app/page.tsx:57–64` — All "Shop the Drop" `<Link>` elements share the identical accessible name `"Shop the Drop"`. A screen reader's links list contains duplicate entries with no drop context. Fix: set the link text (or add `aria-label`) to `"Shop the Drop — {drop.name}"`.

**[SEVERITY: LOW]** `app/page.tsx:55` — `DropCountdown` receives `endsAt={drop.end_at ?? ''}`. If `end_at` is `null` or `undefined`, the component receives an empty string `''`. Whether `DropCountdown` handles an empty-string `endsAt` gracefully is not verifiable here, but passing an empty string to a countdown that likely calls `new Date('')` (which is `Invalid Date`) is a latent crash risk. Fix: guard with `{drop.end_at && <DropCountdown endsAt={drop.end_at} />}` and hide the countdown row when no end date is set.

---

### `components/home/HeroSection.tsx`

**[SEVERITY: LOW]** `components/home/HeroSection.tsx:17` — The `<section>` element has no `aria-label` or `aria-labelledby`. While the `<h1>` inside it provides context for sighted users, some assistive technologies announce section landmarks by name when navigating by landmark. Fix: add `aria-label="Hero"` or `aria-labelledby` pointing to the `<h1>` id.

> No other issues found. `'use client'` is on line 1 ✓. Framer Motion `custom` prop types are correct ✓. Link text "Shop Now" is visible and meaningful ✓.

---

### `app/track/page.tsx`

**[SEVERITY: LOW]** `app/track/page.tsx:8` — `OrderTracker` already renders a `<main>` element at its root. If the root layout (`app/layout.tsx`) wraps page content in another `<main>`, this creates nested `<main>` elements, which is invalid HTML (only one `<main>` landmark is permitted per page). Fix: change `OrderTracker`'s root element from `<main>` to `<div>`, since the page is responsible for the `<main>` wrapper, or confirm the root layout does not use `<main>`.

> No server/client boundary violations. Server component renders client component correctly ✓. `metadata` export is valid ✓.

---

### `components/track/OrderTracker.tsx`

**[SEVERITY: HIGH]** `components/track/OrderTracker.tsx:120–126` — The result `<div>` and server-error `<div>` (lines 108–113) are rendered via state changes but are not in an `aria-live` region. When tracking results appear, screen reader users receive no announcement. Fix: wrap the result and error output in a `<div role="status" aria-live="polite">` container that is always present in the DOM (even when empty) so the live region is registered before content is injected.

**[SEVERITY: HIGH]** `components/track/OrderTracker.tsx:109` — The server error container has no `role="alert"`. Error messages are high-priority announcements and should use `aria-live="assertive"` or `role="alert"`. Fix: add `role="alert"` to the error `<div>`.

**[SEVERITY: MEDIUM]** `components/track/OrderTracker.tsx:47` — There is no `AbortController` timeout on the `fetch('/api/chat', ...)` call. If the chat API hangs (cold start, network stall), the `loading` state is `true` indefinitely with no recovery path for the user. Fix: wrap the fetch with an `AbortController` and `setTimeout` of ~15 seconds; catch `AbortError` and set `serverError` to a timeout message.

**[SEVERITY: MEDIUM]** `components/track/OrderTracker.tsx:100,116` — Form inputs do not have `aria-describedby` attributes linking them to their inline error paragraphs. Screen readers may not associate the error message with the field that caused it. Fix: assign `id="orderId-error"` / `id="email-error"` to the error `<p>` elements and add `aria-describedby="orderId-error"` / `aria-describedby="email-error"` to the corresponding `<input>` elements.

**[SEVERITY: MEDIUM]** `components/track/OrderTracker.tsx:136` — The submit button has `disabled={loading}` but no `aria-disabled` attribute. The HTML `disabled` attribute removes the element from the tab order entirely, preventing keyboard users from encountering focus feedback during submission. Fix: replace or supplement with `aria-disabled={loading}` and handle the click guard in `onSubmit` instead of relying on `disabled`, or keep `disabled` but ensure the focus is managed explicitly.

**[SEVERITY: LOW]** `components/track/OrderTracker.tsx:74` — The `JSON.stringify(data)` fallback for unrecognised response shapes will render a raw JSON string to the user (e.g., `{"someField":"value"}`). This is a poor UX cliff-edge. Fix: replace the fallback with a generic `"We received a response but couldn't parse it. Please try again."` message.

---

### `lib/utils.ts`

> No issues found. `cn()` using `clsx` + `tailwind-merge` is correct. `import { type ClassValue, clsx }` uses valid inline `type` modifier syntax ✓.

---

### `components.json`

**[SEVERITY: MEDIUM]** `components.json` — The `components.json` file exists but the previous audit (T1 Shadcn Gap section) confirmed that `app/globals.css` has no Shadcn CSS variable block, `tailwind.config.ts` has no `darkMode: ["class"]` or `tailwindcss-animate`, and `components/ui/` contains hand-written stubs, not Radix-backed Shadcn components. The presence of `components.json` without the corresponding init artefacts means `npx shadcn-ui@latest add <component>` will succeed in generating files but those files will reference CSS variables (`var(--primary)`) that don't exist, producing invisible or unstyled components. Fix: complete the Shadcn init as specified in the Shadcn Gap Analysis section above before running any `add` commands.

**[SEVERITY: LOW]** `components.json:7` — `"cssVariables": false` means Shadcn generates components using raw Tailwind classes (e.g., `bg-zinc-900`) rather than mapped CSS variables. This setting diverges from the Shadcn default and from what most Shadcn documentation examples show. If any component is later added by a developer following online examples (which assume `cssVariables: true`), theming will be inconsistent. Document this as an intentional decision in the workspace rules or reconsider during the Shadcn init pass.

---

## Phase 2 Delivery — Summary of Findings

| Severity | Count | Files Affected |
|----------|-------|----------------|
| **CRITICAL** | **2** | `OrdersList.tsx`, `orders/page.tsx` |
| **HIGH** | **5** | `orders/page.tsx` (×2), `page.tsx`, `OrderTracker.tsx` (×2) |
| **MEDIUM** | **8** | `OrdersList.tsx` (×2), `OrdersPageSkeleton.tsx`, `orders/page.tsx`, `OrderTracker.tsx` (×3), `components.json` |
| **LOW** | **7** | `page.tsx` (×2), `OrdersList.tsx`, `OrdersPageSkeleton.tsx`, `HeroSection.tsx`, `track/page.tsx`, `OrderTracker.tsx` |

---

## FIXES NEEDED — Priority Order

1. **[CRITICAL]** Fix `ReviewModal` call in `OrdersList.tsx` — add `open={true}` (or `open={reviewTarget !== null}`) and remove the non-existent `productName` prop. The review modal is completely non-functional without this fix.

2. **[CRITICAL]** Replace `getServerSupabase()` in `app/account/orders/page.tsx` with `@supabase/ssr createServerClient` that reads `next/headers` cookies. Without this, every authenticated user is redirected away from `/account/orders` because `auth.getUser()` always returns null on a plain service-role client.

3. **[HIGH]** Add `export const dynamic = 'force-dynamic'` to `app/account/orders/page.tsx` to prevent static caching of per-user order data.

4. **[HIGH]** Switch the orders query in `app/account/orders/page.tsx` from the service-role client to the anon-key SSR client so RLS policies enforce data isolation at the database level, not just in application code.

5. **[HIGH]** Add `aria-live="polite"` result region and `role="alert"` error region to `OrderTracker.tsx` so screen reader users are notified when tracking results or errors appear.

6. **[HIGH]** Add an empty-state guard to `NewArrivalsGrid` in `app/page.tsx` — render a fallback message when `getPublishedProducts()` returns `[]`.

7. **[MEDIUM]** Add `AbortController` fetch timeout (~15 s) to `OrderTracker.tsx` to prevent indefinite loading states on slow or hung API responses.

8. **[MEDIUM]** Add `aria-busy="true"` and `aria-label="Loading your orders"` to `OrdersPageSkeleton.tsx`.

9. **[MEDIUM]** Add `aria-expanded={expanded}` to the order-row expand button in `OrdersList.tsx`.

10. **[MEDIUM]** Add `aria-label` with product name context to all "Leave a Review" buttons in `OrdersList.tsx`.

11. **[MEDIUM]** Add `aria-describedby` on form inputs in `OrderTracker.tsx` pointing to their respective error paragraphs.

12. **[LOW]** Guard `DropCountdown` in `app/page.tsx` — only render when `drop.end_at` is non-null; pass a typed `string` rather than `string | ''`.

13. **[LOW]** Disambiguate all "Shop the Drop" link labels in `app/page.tsx` by appending the drop name.

14. **[LOW]** Resolve potential nested `<main>` issue between `app/track/page.tsx` and `OrderTracker.tsx` — one of them must own the `<main>` element.

---

*End of Audit Report. Total issues found: 42 baseline (Tier 1–3) + 22 Phase 2 delivery findings = **64 total tracked issues**.*
