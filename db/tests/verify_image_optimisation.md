# Image Optimisation Audit — Sprint 3 QA

## Files Checked
- `components/ProductCard.tsx`
- `components/ProductImageGallery.tsx`
- `app/(storefront)/shop/page.tsx`
- `app/(storefront)/shop/[slug]/page.tsx`

## Criteria
| # | Rule |
|---|------|
| a | `import Image from 'next/image'` — no raw `<img>` tags |
| b | Non-empty, descriptive `alt` attribute on every image |
| c | `fill` with a positioned parent (`relative` + `aspect-ratio`) OR explicit `width`/`height` |
| d | `priority` on hero/above-fold images; absent on below-fold grid images |

## Findings

| File | Criterion | Result | Notes |
|---|---|---|---|
| `ProductCard.tsx` | a | ✅ | `import Image from 'next/image'` present |
| `ProductCard.tsx` | b | ✅ | `alt={product.name}` — always non-empty |
| `ProductCard.tsx` | c | ✅ | `fill` + parent `relative aspect-[4/5]` |
| `ProductCard.tsx` | d | ✅ | No `priority` — correct for lazy-loaded grid cards |
| `ProductImageGallery.tsx` | a | ✅ | `import Image from 'next/image'` present |
| `ProductImageGallery.tsx` | b | ✅ | Main: `${productName} – image ${n}`; thumbs: `${productName} thumbnail ${n}` |
| `ProductImageGallery.tsx` | c | ✅ | `fill` + parent `relative aspect-[4/5]` for main; thumbs have `fill` + `h-16 w-16` |
| `ProductImageGallery.tsx` | d | ✅ | Main image has `priority`; thumbnails do not |
| `shop/page.tsx` | — | ✅ | No direct `<Image>` render; delegates to `ProductGrid → ProductCard` |
| `shop/[slug]/page.tsx` | — | ✅ | No direct `<Image>` render; delegates to `ProductImageGallery` |

## Fixes Applied
**None.** All image renders already comply with all four criteria.

## Manual Verification Steps (WebP delivery)
1. Open Chrome DevTools → Network tab.
2. In the filter bar type `.webp` (or set MIME filter to `image/webp`).
3. Hard reload the `/shop` page and the product detail page.
4. Confirm that Next.js `/_next/image?url=…&w=…&q=75` responses appear with `Content-Type: image/webp`.
5. Verify the `sizes` attribute on grid cards (`50vw / 33vw / 25vw`) matches the actual rendered widths at each breakpoint using the responsive ruler.
