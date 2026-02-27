# Sprint 7: Shiprocket Automation & Shipping Logic

## Sprint Goal
Automate the physical dispatch process by integrating the Shiprocket API. Dynamically fetch logistics credentials from the `StoreSettings` table, push paid orders to Shiprocket, generate AWBs (Airway Bills), fetch shipping labels, and display tracking statuses in the Admin dashboard.

---



## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Dynamic Authentication:** Write a utility to fetch the Shiprocket Email and Password from the `StoreSettings` table. Use these to call the Shiprocket Auth API (`/v1/external/auth/login`) and retrieve the temporary Bearer token.
2. **Order Fulfillment API (`/api/admin/orders/[id]/fulfill`):** Create a secure, Admin-only Route Handler that:
   - Fetches the specific `Order` details (items, weight, dimensions, customer shipping address) from the database.
   - Pushes the order to Shiprocket (`/v1/external/orders/create/adHoc`) using the Bearer token.
   - Extracts the `shiprocket_order_id` and `shipment_id` from the response and saves them to your `Orders` table.
3. **AWB & Label Generation:** Extend the fulfillment API (or create subsequent endpoints) to automatically request an AWB assignment for the shipment and fetch the URL for the printable shipping label. Update the `Orders` table with the `awb_code`, `courier_name`, and `label_url`.
4. **API Contract:** Update `docs/api_contract.md` to include the new Shiprocket fulfillment endpoints and the updated `Orders` table schema (which now needs columns for tracking).

### Frontend Requirements (Delegate to @frontend-specialist)
1. **Admin Order Details UI:** Enhance the `/admin/orders/[id]` page. 
   - Add a "Fulfillment" card displaying the shipping address and current fulfillment status (Unfulfilled, Manifested, Shipped, Delivered).
   - Build a "Fulfill with Shiprocket" button that triggers the backend fulfillment API. Include loading states to prevent double-clicking.
2. **Post-Fulfillment State:** Once an order is fulfilled, replace the fulfill button with a "Download Shipping Label" button (linking to the generated `label_url`) and display the AWB number and assigned Courier.
3. **Error Handling UI:** Display clear error toasts (using Shadcn's `useToast`) if Shiprocket rejects the order (e.g., "Invalid Pincode" or "Serviceability not available").

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Token Caching Audit:** Shiprocket tokens expire. Verify that the backend agent implemented a mechanism to handle token expiration (e.g., generating a new token per request or caching it securely in memory/Redis for its valid duration, rather than requesting a new one for every single API call if not needed, though per-request is safer for an MVP).
2. **Invalid Pincode Test:** Manually alter an order's shipping pincode to an invalid 6-digit number in the database. Trigger the fulfillment API and verify that the backend catches the Shiprocket API error gracefully and returns a readable 400 error to the frontend, instead of crashing.
3. **Admin RLS Check:** Verify that the fulfillment API endpoints strictly validate that the user making the request has the `Admin` role before interacting with Shiprocket.

---

## Definition of Done (Orchestrator Review)
- [ ] Admin can successfully push an order to Shiprocket with a single click.
- [ ] The `Orders` database table correctly saves the `shiprocket_order_id`, `awb_code`, and `label_url`.
- [ ] The Admin UI displays the generated shipping label and tracking number.
- [ ] Shiprocket API errors (like unserviceable areas) are caught and displayed gracefully in the Admin UI.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with decisions regarding Shiprocket token management and API error handling.