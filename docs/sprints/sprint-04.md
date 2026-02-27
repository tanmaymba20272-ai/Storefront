# Sprint 4: Fluid Cart & State Management

## Sprint Goal
Build an instantaneous, seamless pre-checkout experience. Implement the client-side Zustand store to manage cart state, build the slide-out cart drawer with Framer Motion, and ensure optimistic UI updates so user actions feel blazingly fast.

---



## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Stock Validation API:** Write a lightweight Supabase Edge Function or RPC endpoint (`/api/validate-cart`). It should take an array of `product_id` and `quantity` and silently verify if the requested quantities are still available in the active Drop.
2. **Pricing & Taxes:** Ensure the API returns the calculated subtotal and estimated GST (based on Indian tax slabs for apparel) so the frontend doesn't rely solely on client-side math.
3. **API Contract:** Document the exact request/response payload for the cart validation endpoint in `docs/api_contract.md`.

### Frontend Requirements (Delegate to @frontend-specialist)
1. **Zustand Store (`store/useCartStore.ts`):** - Create a global state to handle `items`, `addItem`, `removeItem`, `updateQuantity`, and `clearCart`.
   - Implement `persist` middleware to save the cart to `localStorage` so items survive page reloads.
2. **The Cart Drawer UI:** - Build a slide-out cart component using Framer Motion (triggering from the right side of the screen). 
   - Use `<AnimatePresence>` to ensure items visually slide out when removed.
   - Include the Subtotal, Estimated GST, and a "Proceed to Checkout" button.
3. **Optimistic Updates:** Wire up the "Add to Cart" buttons on the product pages. When clicked, the UI must update instantly via Zustand, while silently calling the backend validation API in the background to confirm stock.

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Hydration Error Prevention:** Audit the Zustand implementation. Because the cart relies on `localStorage`, ensure the frontend agent wrote a custom hydration hook (e.g., `useStore`) or wrapped the cart trigger in a component that only renders after the client has mounted to prevent Next.js hydration mismatch errors.
2. **Accessibility (a11y):** Test the Cart Drawer to ensure focus is trapped inside the drawer when open, and that pressing the `Escape` key successfully closes it.
3. **Edge Case Testing:** Attempt to add an item to the cart that exceeds the active Drop's inventory limit. Verify the UI correctly handles the backend validation error and reverts the optimistic update gracefully.

---

## Definition of Done (Orchestrator Review)
- [ ] Zustand store accurately tracks items, quantities, and persists across reloads without throwing hydration errors in the browser console.
- [ ] Cart drawer opens and closes fluidly with Framer Motion.
- [ ] "Add to Cart" actions feel instantaneous but are protected by backend validation.
- [ ] GST and subtotals are calculated accurately.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with decisions regarding state persistence and hydration handling.