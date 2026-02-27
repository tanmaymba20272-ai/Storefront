# Sprint 1: Architecture, OAuth & Dynamic Settings Foundation

## Sprint Goal
Establish the foundational database architecture for commerce and content, configure Supabase Auth (including OAuth providers), and build the secure infrastructure for dynamic environment variables so no third-party keys are ever hardcoded.

---

## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Schema Initialization:** Design and execute the Supabase PostgreSQL schema for the following tables:
   - `Users` (Must handle Admin vs Customer roles securely).
   - `Products`, `Categories`, `Drops`.
   - `BlogPosts` (For the CMS).
   - `Reviews` (For verified purchases later).
   - `StoreSettings` (CRITICAL: Must be strictly protected by RLS; only Admins can read/write API keys here).
2. **Authentication:** Configure Supabase Auth to accept Email/Password alongside scaffolding for OAuth providers (Google, Apple, Facebook).
3. **API Contract:** Output the exact TypeScript interfaces for these tables and document them in `docs/api_contract.md`.

### Frontend Requirements (Delegate to @frontend-specialist)
1. **Project Scaffold:** Ensure the Next.js App Router (TypeScript), Tailwind CSS, Shadcn UI, and Zustand are properly initialized. 
2. **Layouts & Routing:** Build the root layout, `Navbar`, and `Footer`. Set up secure route groups for `(storefront)` and `(admin)`.
3. **Auth UI:** Build the responsive login and registration modals/pages. Include visually distinct UI buttons for Email/Password and the OAuth providers (Google, Apple, Facebook). Ensure it reflects a premium, minimalistic aesthetic.

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Type Safety:** Audit the frontend layouts and Auth UI against the newly generated `docs/api_contract.md`. Hunt down and resolve any `any` types or mismatches.
2. **RLS Verification:** Verify that the database schema correctly applies Row Level Security so that a standard 'Customer' or 'Guest' cannot access or read the `StoreSettings` table under any circumstances.
3. **Refactor:** Clean up any unused generic Next.js boilerplate code, CSS, or redundant components left over from the initial framework installation.

---

## Definition of Done (Orchestrator Review)
- [ ] Database schema is live, fully normalized, and documented in `docs/api_contract.md`.
- [ ] Auth UI is functional, fluid, and properly routes users based on their role.
- [ ] `StoreSettings` table is highly secure and ready for Phase 2 integrations.
- [ ] No TypeScript errors remain in the codebase.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with any new architectural decisions made during this sprint.