# Sprint 5: Razorpay Checkout & High-Concurrency Locking

## Sprint Goal
Integrate the Razorpay payment gateway for seamless checkout while implementing strict database transaction isolation (row-level locking) to guarantee zero overselling during high-traffic limited drops. API keys must be fetched dynamically from the `StoreSettings` table.

---



## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Dynamic Key Retrieval:** Write a secure utility to fetch and decrypt the `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the `StoreSettings` table. This must happen on the server side; these secrets must never be exposed to the client.
2. **High-Concurrency Inventory Locking:** Implement a Supabase RPC (Remote Procedure Call) using PL/pgSQL. 
   - It must use `SELECT ... FOR UPDATE` to lock the specific product rows.
   - It must check if `requested_quantity <= available_stock`.
   - If true, temporarily reserve the stock (or deduct it) and return success. If false, rollback and return an `INVENTORY_EXHAUSTED` error.
3. **Razorpay Order Creation API:** Create a Next.js Route Handler (`/api/checkout`). 
   - It takes the cart items and the user's shipping address.
   - It calls the inventory locking RPC first.
   - If stock is secured, it uses the Razorpay Node.js SDK to generate a `razorpay_order_id`.
   - It creates a "Pending" order in the `Orders` table linked to this Razorpay ID.
4. **API Contract:** Update `docs/api_contract.md` with the exact payload required to initiate the checkout and the response containing the `razorpay_order_id`.



### Frontend Requirements (Delegate to @frontend-specialist)
1. **Checkout Flow UI:** Build the `/checkout` page. 
   - Create a form to collect shipping details (integrated with Zod for validation).
   - Display an order summary (subtotal, shipping, GST).
2. **Razorpay SDK Integration:** - Inject the Razorpay checkout script (`https://checkout.razorpay.com/v1/checkout.js`) dynamically when the user clicks "Pay Now".
   - Wire up the checkout button to call the `/api/checkout` endpoint.
   - On success, pass the returned `razorpay_order_id` and the public `RAZORPAY_KEY_ID` (fetched via a safe public endpoint) to the Razorpay modal options.
3. **Payment Callbacks:** Handle the frontend success and dismissal handlers for the Razorpay modal. On success, route the user to a generic `/checkout/processing` state (we will handle the actual webhook verification in Sprint 6).

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Concurrency Simulation:** The most critical test. Write a script or instruct the Orchestrator on how to simulate two simultaneous API calls attempting to buy the *last remaining item* of a drop. Verify that only one succeeds and the other receives the `INVENTORY_EXHAUSTED` error.
2. **Security Audit:** Verify that the `RAZORPAY_KEY_SECRET` is completely absent from any client-side bundles or frontend network payloads.
3. **Rollback Verification:** Test what happens if the inventory is successfully locked, but the Razorpay API fails to create an order (e.g., due to network timeout). Ensure there is a mechanism or documented plan to release the locked inventory.

---

## Definition of Done (Orchestrator Review)
- [ ] Database successfully uses `FOR UPDATE` to lock rows and prevent overselling.
- [ ] Razorpay API keys are dynamically fetched from the database, not `.env` files.
- [ ] Frontend successfully triggers the Razorpay payment modal with the correct Order ID.
- [ ] The checkout process handles "Out of Stock" errors gracefully and alerts the user.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with the specific transaction patterns and error handling strategies used.