# Sprint 6: Order Management & Webhooks

## Sprint Goal
Securely close the transaction loop by listening to Razorpay webhooks. Cryptographically verify successful payments, permanently commit the locked inventory, update the order status, and provide the user with a fluid post-purchase confirmation screen.

---



## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Webhook Endpoint (`/api/webhooks/razorpay`):** Create a secure Next.js Route Handler to listen for Razorpay events (specifically `order.paid` and `payment.captured`).
2. **Signature Verification:** - Dynamically fetch the `RAZORPAY_WEBHOOK_SECRET` from the `StoreSettings` table.
   - Use the Node.js `crypto` module to generate a SHA256 HMAC of the raw request body using the secret.
   - Compare the generated signature with the `x-razorpay-signature` header to verify authenticity.
3. **Idempotency & State Updates:** - Check if the `order_id` in the webhook payload has already been marked as 'Paid' to prevent duplicate processing.
   - If valid and unpaid, update the `Orders` table status to 'Processing'.
   - Permanently commit the inventory deduction (finalizing the row-level lock from Sprint 5).
   - If a payment fails or the session expires, write a fallback logic or scheduled edge function to release the reserved inventory back to the drop pool.
4. **API Contract:** Document the expected webhook payloads and order status enums in `docs/api_contract.md`.

### Frontend Requirements (Delegate to @frontend-specialist)
1. **The Success Page (`/checkout/success`):** Build a premium order confirmation page. 
   - It should take an `order_id` parameter from the URL.
   - Fetch the sanitized order details (items, total paid, shipping address) from the database and display them beautifully.
   - Include a "Continue Shopping" button to route back to `/shop`.
2. **Cart State Clearing:** Write logic to automatically clear the Zustand `useCartStore` only *after* the user successfully lands on the success page or the backend confirms the order is paid.
3. **Admin Orders View:** Add the "Orders" module to the `/admin` dashboard. Build a data table displaying incoming orders, their payment status, and the customer details.

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Signature Forgery Test:** Manually trigger the webhook endpoint using a tool like Postman or the Razorpay CLI. Intentionally alter the payload or send an invalid signature header. Verify that the endpoint rejects the request with a `400 Bad Request` and does *not* update the database.
2. **Idempotency Check:** Fire the exact same successful webhook payload twice. Ensure the database doesn't attempt to deduct the inventory a second time.
3. **State Management Audit:** Ensure that if a user clicks "Back" during the Razorpay modal, their cart remains intact and the inventory lock is handled gracefully.

---

## Definition of Done (Orchestrator Review)
- [ ] The webhook endpoint successfully receives and cryptographically verifies Razorpay events.
- [ ] The `Orders` table correctly reflects 'Paid' or 'Failed' statuses based on webhook data.
- [ ] Duplicate webhooks do not cause duplicate inventory deductions.
- [ ] The user sees a polished success page and their local cart is cleared.
- [ ] The Admin dashboard successfully lists the newly paid orders.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with webhook security protocols and state clearing decisions.