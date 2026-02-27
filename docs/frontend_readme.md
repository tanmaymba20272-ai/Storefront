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
