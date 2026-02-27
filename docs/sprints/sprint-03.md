# Sprint 3: The Storefront & "Old Money" Aesthetic

## Sprint Goal
Translate the brand's premium, sustainable, "Old Money" aesthetic into a fluid, user-facing catalog. Build the public storefront to fetch and display active products and scheduled drops with blazingly fast perceived load times.

---



## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Catalog Read APIs:** Write highly optimized Next.js Server Actions or Supabase queries to fetch:
   - All active `Categories`.
   - All `Products` where `status = 'published'`.
   - `Drops` that are currently active or upcoming (for a teaser section).
2. **Image Optimization:** Ensure the data returned includes the full Supabase Storage public URLs for product images.
3. **API Contract:** Update `docs/api_contract.md` with the exact payload shapes returned by these public-facing fetch queries.

### Frontend Requirements (Delegate to @frontend-specialist)
1. **Design System Implementation:** Configure `tailwind.config.ts` with the "Old Money" color palette (e.g., muted creams, deep navy, forest greens, subtle golds) and elegant typography (e.g., a premium serif for headings, clean sans-serif for body).
2. **The Catalog Page (`/shop`):** Build the dynamic storefront grid. Implement category filtering and sorting. Ensure the grid uses CSS Grid/Flexbox for perfect mobile responsiveness. 
3. **The Product Page (`/shop/[id]`):** Build the individual product detail page. 
   - Create a fluid image gallery using Framer Motion (support for swipe gestures on mobile and smooth transitions).
   - Display variant selectors (Size/Color) and dynamic stock indicators (e.g., "Only 3 left in this drop").
4. **Performance & Fluid UX:** Strictly use React `<Suspense>` boundaries wrapping the product grid. Use Shadcn `<Skeleton />` components to create instant perceived loading states before the Supabase data resolves.

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Performance Audit:** Verify that the `next/image` component is being used correctly for all product images to ensure automatic WebP conversion and lazy loading. Run a quick check to ensure there are no massive layout shifts (CLS) when images load.
2. **Mobile Responsiveness:** Audit the product gallery and catalog grid on mobile viewport settings. Ensure tap targets (variant buttons) are accessible and large enough.
3. **Data Leakage Check:** Ensure the public catalog fetch functions *never* return sensitive admin data (like cost price, or draft products that are not meant to be seen yet).

---

## Definition of Done (Orchestrator Review)
- [ ] The storefront successfully displays products pulled dynamically from the Supabase database.
- [ ] Product filtering and dynamic routing to individual product pages work flawlessly.
- [ ] The UI perfectly reflects the requested premium aesthetic without feeling sluggish.
- [ ] Loading states (Skeletons) are visually smooth and prevent layout shifts.
- [ ] No TypeScript errors exist in the new page layouts.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with decisions regarding the frontend design system and fetching strategies.