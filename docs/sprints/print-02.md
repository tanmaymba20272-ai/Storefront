# Sprint 2: Admin Dashboard, CMS & Master Integration Hub

## Sprint Goal
Build the secure admin control center to manage the product catalog (with limited drop scheduling), author blog posts, and securely configure third-party API keys (Razorpay, Shiprocket, Email, LLMs) via the `StoreSettings` table.

---

## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Storage Setup:** Create and configure Supabase Storage buckets for `product-images` and `blog-media`. Ensure strict RLS policies (only Admins can upload/delete; public can read).
2. **CRUD APIs:** Write Next.js Server Actions or Supabase RPCs for full Create, Read, Update, Delete operations on `Products`, `Categories`, `Drops`, and `BlogPosts`.
3. **Secure Settings Vault:** Implement a secure utility function (using Node.js `crypto` or similar Edge-compatible library) to encrypt API keys before saving them to the `StoreSettings` table, and decrypt them when fetched by the server. 
4. **API Contract:** Update `docs/api_contract.md` with the new Server Action signatures and Storage bucket URLs.

### Frontend Requirements (Delegate to @frontend-specialist)
1. **Admin Layout:** Build the protected `/admin` route layout. Implement a persistent sidebar navigation (Dashboard, Catalog, Drops, Content, Integrations). Wrap this layout in an Auth check that strictly requires the `Admin` role.
2. **Catalog & Drops UI:** Build the data tables and forms to create/edit products. Include a specific interface for assigning products to a "Drop" (setting live dates and initial stock). Use Shadcn forms and Zod for validation.
3. **CMS UI:** Build a clean, minimalistic rich-text editor interface for drafting `BlogPosts`.
4. **Integrations Hub:** Build the "Settings & Integrations" page. Create distinct form sections to input and save credentials for:
   - Razorpay (Key ID & Key Secret)
   - Shiprocket (Email & Password/Token)
   - Email Provider (e.g., Resend API Key)
   - AI Provider (e.g., OpenAI/Anthropic API Key)

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Route Protection Verification:** Write a test or manually verify that authenticated 'Customers' and 'Guests' attempting to navigate to `/admin` are immediately redirected to the home page or login screen.
2. **Upload Policy Audit:** Attempt to upload a file to the Supabase Storage buckets as an unauthenticated user to verify that the RLS upload policies block the action.
3. **Form Validation:** Ensure all Admin forms use strict Zod schemas. Specifically, verify that product pricing and inventory stock inputs reject negative numbers and invalid characters.

---

## Definition of Done (Orchestrator Review)
- [ ] Admin layout is completely gated and inaccessible to non-admins.
- [ ] Products, Drops, and Blog posts can be successfully created and saved to the database.
- [ ] Images upload successfully to Supabase Storage and link correctly to database records.
- [ ] The Integrations UI successfully encrypts and saves third-party API keys to the `StoreSettings` table.
- [ ] No TypeScript errors remain in the components or Server Actions.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with decisions regarding encryption methods and Admin UI state management.