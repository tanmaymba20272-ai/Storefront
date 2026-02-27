# Data Leakage Audit — Sprint 3 QA

## File Audited
`lib/actions/catalog.ts`

## Criteria
| # | Rule |
|---|------|
| a | No sensitive column names (`cost_price`, `margin`, `wholesale`) in any select |
| b | `getPublishedProducts` explicitly filters `status = 'published'` |
| c | `store_settings` table is never queried |
| d | `inventory_count` exposed only in `getProductBySlug` (detail), NOT in `getPublishedProducts` (list) |

## Fields Returned Per Function

### `getCategories()`
Selected: `id, name, slug`

### `getPublishedProducts()`
Selected: `id, name, slug, price_cents, currency, metadata, category(id,name,slug), drop(id,name,start_at,end_at,status)`
Filter: `.eq('status', 'published')` ✅

### `getActiveAndUpcomingDrops()`
Selected: `id, name, start_at, end_at, status`

### `getProductBySlug()`
Selected: `id, name, slug, price_cents, currency, description, metadata, inventory_count, category(id,name,slug), drop(id,name,start_at,end_at,status)`

## Findings

| Criterion | Result | Notes |
|---|---|---|
| a — No sensitive fields | ✅ Pass | `cost_price`, `margin`, `wholesale` absent from all select strings |
| b — Draft filter in list | ✅ Pass | `.eq('status', 'published')` on line ~136 of catalog.ts |
| c — No store_settings | ✅ Pass | The string `store_settings` does not appear anywhere in this file |
| d — inventory_count list | ✅ Pass | `inventory_count` is absent from `getPublishedProducts` select; present only in `getProductBySlug` |

## Fixes Applied
**None.** No data leakage violations found.

## Intentional Omissions
| Field | Omitted from | Reason |
|---|---|---|
| `inventory_count` | `getPublishedProducts` | Prevents front-end stock scraping on the listing page; stock indicators are only shown on the individual product detail page where a user has chosen to view that item |
| `description` | `getPublishedProducts` | Reduces list payload size; description is only needed on detail page |
| `cost_price` / `margin` | All public actions | Business-sensitive pricing data; never exposed to unauthenticated callers |
| `status` (as returned field) | `getPublishedProducts` | Status is used only as a filter predicate, not returned — removes risk of accidentally rendering `draft` labels |
