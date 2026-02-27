# Sprint 11: Comprehensive Audit, Tech Debt Eradication & E2E Polish

## Sprint Goal
Systematically audit the entire repository for hidden technical debt, resolve known critical blockers (missing pages, TTL jobs, shipping webhooks), and establish a rock-solid, type-safe baseline before launch. 

> **🛑 CRITICAL ORCHESTRATOR DIRECTIVE:** > Do NOT attempt to fix all tech debt simultaneously. You must execute Phase 1 (The Audit) and PAUSE for human approval before writing any code to fix global issues.

---

## Phase 1: The Global Repository Audit (Delegate to @qa-integration)

1. **Static Analysis:** Run standard CLI checks (e.g., `npx tsc --noEmit` and `npm run lint`) to uncover all hidden TypeScript and ESLint errors across the repo.
2. **Component & Dependency Audit:** Scan the `app/` and `components/` directories. Identify unused components, dead code, missing Next.js layout files, or client/server boundary violations.
3. **The Audit Report:** Generate a new file at `docs/AUDIT_REPORT.md`. Categorize the findings into:
   - Tier 1: Build-Breaking Errors (e.g., missing `page.tsx`).
   - Tier 2: Type Mismatches & API Contract Violations.
   - Tier 3: Unused Code & Performance Warnings.
4. **⏸️ HANDOFF PAUSE:** Print *"Audit Complete. Please review `docs/AUDIT_REPORT.md`. Type **'Approved'** to begin Phase 2."*

---

## Phase 2: Known Critical Resolves (Delegate to @backend-specialist & @frontend-specialist)

*Execute these specific, pre-identified blockers first:*
1. **Inventory TTL Expiry Job (Backend):** Write a Supabase `pg_cron` SQL script to run every 5 minutes. It must scan the `Orders` table for 'Pending' orders older than 15 minutes, release the `Products` row-level lock, and mark the order 'Abandoned'.
2. **Shiprocket Delivery Webhook (Backend):** Create `/api/webhooks/shiprocket` to listen for 'Delivered' statuses, verify the signature, and update the `Orders` table.
3. **Shadcn Full Init (Frontend):** Audit `components/ui` and `components.json`. Ensure the "Old Money" CSS variables and critical components are properly initialized.
4. **Order Tracking Storefront (Frontend):** Build the public `/track` page where users input `Order ID` and `Email` to fetch their Shiprocket status.

---

## Phase 3: Systematic Debt Resolution (Orchestrator Led)

1. **Batch Execution:** The Orchestrator will read `docs/AUDIT_REPORT.md` and delegate the fixes to the specialists in strictly isolated batches:
   - **Batch 1:** Fix all Tier 1 (Build-Breaking) errors (including restoring the missing `page.tsx`).
   - **Batch 2:** Fix all Tier 2 (TypeScript/Contract) errors.
   - **Batch 3:** Clean up Tier 3 (Dead code/Refactoring).
2. **Verification:** After each batch, `@qa-integration` must re-run `tsc --noEmit` to ensure the fixes didn't cause cascading failures elsewhere.

---

## Phase 4: E2E Verification (Delegate to @qa-integration)

1. **Playwright Initialization:** Install and configure Playwright (`npm init playwright@latest`). 
2. **Critical Flow E2E Test:** Write `tests/checkout.spec.ts` to simulate a user adding a product to the cart, filling out the shipping form, and triggering the checkout process.

---

## Definition of Done (Orchestrator Review)
- [x] `docs/AUDIT_REPORT.md` was generated and all Tier 1 & 2 items are resolved.
- [x] Next.js builds successfully (`npm run build`) with zero TypeScript errors.
- [x] TTL cron job and Shiprocket webhooks are implemented.
- [x] Playwright tests pass locally.
- [x] `docs/MEMORY.md` updated with final architectural cleanup notes.