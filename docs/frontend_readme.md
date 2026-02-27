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

---

## Sprint 3 — "Old Money" Storefront

### Design System (`tailwind.config.ts`)

The config was converted to TypeScript and extended with the **Old Money** palette and premium typography:

| Token      | Hex       | Usage                                        |
|------------|-----------|----------------------------------------------|
| `cream`    | `#F5F0E8` | Page backgrounds, card fills                 |
| `navy`     | `#1B2A4A` | Primary text, deep headers, CTA buttons      |
| `forest`   | `#2D4A3E` | Accent buttons, hover states                 |
| `gold`     | `#C9A84C` | Highlights, badges, price labels             |
| `charcoal` | `#2C2C2C` | Body copy                                    |
| `stone`    | `#8A8278` | Muted text, placeholders, borders            |
| `ivory`    | `#FAF7F2` | Elevated cards, dropdowns                    |

Font families:
- `font-serif` → `'Playfair Display'`, Georgia, serif
- `font-sans` → `'Inter'`, system-ui, sans-serif

Both fonts are imported in `app/globals.css` via Google Fonts (`@import url(...)`).

### New Routes

| Route           | File                                              | Type   |
|-----------------|---------------------------------------------------|--------|
| `/shop`         | `app/(storefront)/shop/page.tsx`                  | Server |
| `/shop/[slug]`  | `app/(storefront)/shop/[slug]/page.tsx`           | Server |

Both routes include dedicated `loading.tsx` files with skeleton states.

### `framer-motion` & `next/image`

- **`framer-motion`** is a required runtime dependency — used in `ProductImageGallery` for `AnimatePresence` fade/slide transitions and mobile swipe (`drag="x"`).
- **`next/image`** is used for all product images with `fill` + positioned parent, explicit `sizes`, and `priority` on the main gallery image. No bare `<img>` tags for product imagery.

Install command:

```bash
npm install framer-motion
```

### New Components

| Component | Type | Description |
|---|---|---|
| `components/ui/Skeleton` | Shared | `animate-pulse` skeleton primitive |
| `components/shop/CategoryFilter` | **Client** | Category filter pill bar (URL params) |
| `components/shop/SortDropdown` | **Client** | Sort select (URL params) |
| `components/shop/ProductGrid` | Server | Responsive 2/3/4-col product grid |
| `components/shop/ShopGridSkeleton` | Server | 8-card loading skeleton |
| `components/ProductCard` | Server | Product card — serif name, gold price, drop badge |
| `components/ProductImageGallery` | **Client** | Framer Motion gallery with swipe |
| `components/products/VariantSelector` | **Client** | Size/colour variant buttons |
| `components/products/AddToCartButton` | **Client** | Typed cart action (no `any`) |
| `components/products/VariantAndCart` | **Client** | Shared state island for variant + cart |

### Testing

Render stubs: `tests/shop.test.tsx`. Deeper tests (snapshot, image, hover) marked TODO.
