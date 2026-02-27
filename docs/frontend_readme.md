# Frontend README

This document lists frontend routes, required env vars, and quick setup notes for Sprint 2 deliverables.

Routes added
- `/products` — product listing (server)
- `/products/[slug]` — product detail (server)
- `/drops` — active drops w/ countdown (server + client countdown)
- `/admin/dashboard` — minimal admin dashboard (protected by `middleware.ts`)

Supabase
- Required env vars (development):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - Optional for middleware role checks: `SUPABASE_SERVICE_ROLE_KEY` (do NOT commit this key)

Notes on middleware
- `middleware.ts` enforces that a Supabase session cookie is present for `/admin` routes.
- To strictly verify `profiles.role === 'admin'` in middleware, provide `SUPABASE_SERVICE_ROLE_KEY`.

UI / packages
- Minimal Tailwind-first UI primitives are included under `components/ui/` as fallbacks.
- Recommended: run `npx shadcn-ui@latest init` to install and scaffold Shadcn UI if you prefer.
- Optional packages used in components: `framer-motion`, `zustand`.
  - Install locally: `npm install framer-motion zustand`

Cart store
- Located at `store/cartStore.ts`. Persists to `localStorage` and exposes `addItem`, `removeItem`, `updateQuantity`, `clearCart`, and drawer controls `open` / `close`.

Admin
- Admin pages are server components and rely on `middleware.ts` for access control. For additional client-side checks, query `profiles` from Supabase in admin client components if needed.

Dev server
- Start Next.js dev server as usual (example):
```bash
npm run dev
```

Tests
- Basic test stubs are under `tests/` — these are placeholders. Install and configure your test runner (Jest + React Testing Library) before running.

Further work (recommended)
- Replace UI primitives by running `npx shadcn-ui@latest init` and following the shadcn docs.
- Add stronger middleware verification using `SUPABASE_SERVICE_ROLE_KEY` on the server (already supported by the middleware file if provided).
# Frontend README (Phase 1)

This folder contains a minimal Next.js App Router TypeScript frontend scaffold for Phase 1 UI deliverables.

Running locally

- Install dependencies (example):

```bash
npm install next react react-dom @supabase/supabase-js tailwindcss postcss autoprefixer
# Optional: testing libs
npm install -D @testing-library/react @testing-library/jest-dom jest
```

- Initialize Tailwind if you haven't already (project-level):

```bash
npx tailwindcss -i ./app/globals.css -o ./public/output.css --watch
```

- Start Next dev server (if this is a Next.js app):

```bash
npm run dev
```

Environment variables

- NEXT_PUBLIC_SUPABASE_URL — your Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY — your Supabase anon/public key

Notes on dependencies

- This scaffold uses Tailwind CSS utility classes. If `@shadcn/ui` or other shadcn packages are installed in your repo, you may replace the simple form components with Shadcn components. If not installed, no changes are required to use the provided Tailwind-first components.

Auth integration notes

- `lib/supabaseClient.ts` exposes a `supabase` client that reads the public env vars at runtime. Do not embed service role keys in the frontend.
- `components/auth/LoginModal.tsx` and `components/auth/RegisterModal.tsx` provide client-side email/password and OAuth flows using Supabase.
- After sign-in the components attempt to read the `profiles` table to route admin users to `/admin` and others to `/`.

Next steps

- Wire server-side endpoints for admin-only operations with Supabase service role keys.
- Add deeper tests with a mocked Supabase client and run test suite in CI.
