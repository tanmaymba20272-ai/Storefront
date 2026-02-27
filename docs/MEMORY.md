# Project Memory & Decision Log
*This file acts as the persistent brain for the agentic team. It MUST be read before any code is written and updated whenever a major architectural decision is made or a sprint is completed.*

## 1. Active Context
- **Current Phase:** Sprint 2 planning (Sprint 1 complete ✅ — 27 Feb 2026).
- **Project Goal:** Building a highly responsive, modern e-commerce web app for a sustainable fashion brand with full Shopify parity.
- **Key Mechanics:** The brand relies on a limited-drop model (requiring strict inventory control) and operates out of India (requiring local payment and shipping logistics).

## 2. Core Architectural Decisions (ADRs)
- **DECISION 1 (Tech Stack):** Frontend is Next.js (App Router, Server-First), Tailwind CSS, Shadcn UI, Framer Motion, and Zustand. Backend is Supabase (PostgreSQL, Auth, Edge Functions). 
- **DECISION 2 (Drop Logic):** Inventory decrements MUST be handled via Supabase RPCs utilizing PostgreSQL row-level locking (`FOR UPDATE`). No overselling is permitted.
- **DECISION 3 (Dynamic Integrations):** Third-party APIs (Razorpay, Shiprocket, OAuth, Email, LLMs) will NEVER be hardcoded. They must be stored in a secure, RLS-protected `StoreSettings` table and managed via the Admin Dashboard.
- **DECISION 4 (Tech Debt Allocation):** Every sprint requires a strict 70/30 split. 70% effort on feature execution, 30% effort strictly dedicated to QA, type-safety, test coverage, and resolving technical debt before the sprint is marked complete.
- **DECISION 5 (Profiles Pattern):** Supabase Auth users are extended via a `profiles` table with a `user_role` enum (`admin | customer`). Role is the single source of truth for access control in both RLS and frontend routing. The `auth.users` row is created by Supabase; a trigger or post-signup hook must create the corresponding `profiles` row with `role = 'customer'` by default.
- **DECISION 6 (Typed Supabase Client):** The Supabase client is typed with a `Database` generic (`SupabaseClient<Database>`) exported from `lib/supabaseClient.ts`. The `Database` type lives in `types/api.ts` and is generated from the schema shape defined in `docs/api_contract.md`. This avoids `any` propagating through Supabase query responses.
- **DECISION 7 (Route Group Structure):** App Router route groups are `app/(storefront)/` for public-facing pages and `app/(admin)/` for the dashboard. Admin routes enforce a client-side role guard that reads `profiles.role` from Supabase; server-side guard via middleware will be added in a future sprint.
- **DECISION 8 (Auth UI Pattern):** Authentication is handled via Supabase client-side Auth (`signInWithPassword`, `signInWithOAuth`). Login/Register are modal-first (no dedicated page route required). After a successful login, the app reads `profiles.role` to perform client-side redirect: `admin → /admin`, `customer → /`.
- **DECISION 9 (Inventory RPC):** The `decrement_inventory(product_id uuid, qty int) RETURNS boolean` Supabase RPC uses `SELECT ... FOR UPDATE` to obtain a row-level lock, preventing overselling. Returns `false` if stock is insufficient. All client inventory updates MUST go through this RPC — never direct UPDATE.

## 3. Known Constraints & Workarounds
- **Supabase env vars required at runtime:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The client intentionally does not throw on missing vars during build to allow static analysis/CI to pass, but will produce runtime warnings.
- **Admin role assignment:** There is no UI for promoting a user to `admin`. For now, this must be done via the Supabase Dashboard SQL editor: `UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';`
- **Shadcn UI not fully initialized:** Auth UI and Navbar/Footer use Tailwind-first accessible components. Shadcn component library should be properly initialized via `npx shadcn-ui@latest init` before Sprint 2 UI work begins.
- **Supabase OAuth providers (Google/Apple/Facebook):** OAuth buttons are wired to `signInWithOAuth` calls. The actual provider credentials (Client IDs, secrets) must be configured in the Supabase Dashboard under Auth > Providers. This is a manual one-time setup step.
- **No middleware-based server guard yet:** Admin route protection is currently client-side only. A Next.js `middleware.ts` using Supabase session cookies should be added in sprint 2 for true server-side protection.
- **Migrations not auto-applied:** All SQL migration files under `db/migrations/` must be applied manually via `supabase db push` or `psql`. See `db/README.md` for instructions.

---

## 4. Sprint Log

### Sprint 1 — Architecture, Auth & Dynamic Settings Foundation ✅ (27 Feb 2026)
**Schema:** 7 tables created — `profiles`, `categories`, `drops`, `products`, `blog_posts`, `reviews`, `store_settings`.
**RLS:** Enabled on all tables. `store_settings` is strictly admin-only (deny-by-default for all non-admins). Inventory decrement is protected via `FOR UPDATE` RPC.
**Auth:** Supabase Auth configured for Email/Password + OAuth scaffolding (Google, Apple, Facebook).
**Frontend:** Root layout, Navbar, Footer, `(storefront)` and `(admin)` route groups, Login/Register modal UI delivered.
**QA:** `tsconfig.json` added with `strict` mode. `types/api.ts` fully typed with `Database` generic. `lib/supabaseClient.ts` typed with `SupabaseClient<Database>`. No `any` types remain in delivered files.
**Docs:** `docs/api_contract.md`, `db/README.md`, `db/tests/verify_rls.sql`, `docs/frontend_readme.md` all created.
**Open items for Sprint 2:** Middleware-based admin guard, Shadcn init, `profiles` auto-creation trigger, OAuth provider configuration in Supabase Dashboard.
