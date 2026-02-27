# Mobile Responsiveness Audit — Sprint 3 QA

## Files Checked
- `components/products/VariantSelector.tsx`
- `components/shop/ProductGrid.tsx`
- `components/shop/CategoryFilter.tsx`

## Criteria
| # | Rule |
|---|------|
| a | Variant selector buttons: `min-h-[44px] min-w-[44px]` (WCAG 2.5.5 AAA, 44×44 px tap target) |
| b | Category filter chips: same 44×44 px tap-target requirement |
| c | Product grid: `grid-cols-2 md:grid-cols-3 xl:grid-cols-4` |

## Findings & Fixes

| File | Criterion | Before | After | Status |
|---|---|---|---|---|
| `VariantSelector.tsx` | a | `min-w-[2.75rem]` only — height was ~32 px at `py-1.5` | `min-h-[44px] min-w-[44px]` | 🔧 Fixed |
| `CategoryFilter.tsx` | b | `shrink-0` only — height ~32 px at `py-1.5` | `min-h-[44px] shrink-0` on both "All" and category buttons | 🔧 Fixed |
| `ProductGrid.tsx` | c | `grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4` | No change needed | ✅ Pass |

## Manual Test Steps

### 375 px (iPhone SE / small phone)
1. Open Chrome DevTools → Toggle Device Toolbar → set to 375 × 812 px.
2. Navigate to `/shop` — verify the grid is 2 columns.
3. Tap a category filter chip — use the Accessibility Inspector (⌘⌥F in Chrome) to confirm the chip hit area reads ≥ 44 × 44 px.
4. Open a product detail page, expand a variant group, and tap a variant button — confirm the same ≥ 44 × 44 px reading.

### 768 px (tablet / iPad)
1. Set DevTools device to 768 × 1024 px.
2. Navigate to `/shop` — verify the grid switches to 3 columns (`md:grid-cols-3`).
3. Repeat Accessibility Inspector checks on filter chips and variant buttons.

### Accessibility Inspector (Chrome)
- DevTools → More Tools → Accessibility.
- Hover over a button/chip; the panel shows the computed bounding box — confirm both height and width ≥ 44 px.
