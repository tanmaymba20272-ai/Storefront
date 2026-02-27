Chat Widget
===========

Quick notes to run and test the chat widget locally.

- Mounting: The widget is mounted in `app/layout.tsx` so it persists across pages.
- Env: Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for auth checks.
- API: Expects a streaming `POST /api/chat` that returns a ReadableStream (chunked text or SSE-like chunks).

Testing
-------

Run the test suite (uses React Testing Library):

```bash
pnpm test
```

Notes
-----

- The widget aborts streaming when closed via an `AbortController`.
- If a user clicks "Track my order" and is unauthenticated, the widget navigates to `/login` (adapt to the project's LoginModal pattern if needed).
