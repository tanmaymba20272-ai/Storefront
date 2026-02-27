# Sprint 12: Infrastructure Upgrades, AI Personalization & UI Primitives

## Sprint Goal
Complete all deferred infrastructure blockers from Sprints 8–11, upgrade the AI chat stack to production-grade rate limiting + history persistence, introduce pgvector-based product recommendations, and install the full Shadcn UI primitive set needed for admin CRUD forms.

> **🛑 ORCHESTRATOR DIRECTIVE:** Never execute all phases simultaneously. Pause at each `HANDOFF PAUSE` for human approval before invoking the next sub-agent.

---

## Phase 1: Backend (Delegate to @backend-specialist)

### B-01 — `profiles` Auto-Creation Trigger Deployment
- Migration `db/migrations/20260227_0005_create_profiles_trigger.sql` already exists.
- Confirm the migration file is correct and idempotent (`CREATE OR REPLACE TRIGGER`, `IF NOT EXISTS` on function).
- Update `docs/MEMORY.md` Known Constraints to strike the "pending deployment" note.
- **Output:** SQL migration confirmed idempotent; `supabase db push` instruction documented.

### B-02 — Storage Bucket Creation
- Document CLI commands for all three buckets:
  - `supabase storage create-bucket product-images` (private, admin-write RLS)
  - `supabase storage create-bucket blog-media` (private, admin-write RLS)
  - `supabase storage create-bucket review-media` (public-read, auth-path-prefix-write RLS)
- RLS policy snippets for `storage.objects` — already in migration 0013 (`review-media`) and DECISION 14 (`product-images`, `blog-media`). Consolidate into a single `db/migrations/20260301_0016_storage_buckets.sql`.
- **Output:** `db/migrations/20260301_0016_storage_buckets.sql` (idempotent bucket + RLS SQL).

### B-03 — Redis Rate-Limiter for `/api/chat`
- Replace the in-memory `Map` (DECISION 40) with **Upstash Redis** `INCR`+`EXPIRE` (10 req / 60s sliding window).
- Use `@upstash/redis` SDK (fetch-based, Edge + Node compatible).
- Key format: `chat_rl:<uid_or_ip>` — same as current rate-limiter key format.
- Env vars required: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (from Upstash Console).
- Fallback: if env vars are not set, log a warning and fall back to the in-memory `Map` (do NOT throw — prevents dev breakage).
- Update `app/api/chat/route.ts`. Remove the module-level `Map`. Keep `export const runtime = 'nodejs'` for now (Redis SDK works in both; Node is safer for the Supabase client already in the route).
- **Output:** Updated `app/api/chat/route.ts`; `package.json` + `devDependencies` updated; DECISION 40 upgraded in MEMORY.md.

### B-04 — Chat History Persistence
- New migration `db/migrations/20260301_0017_chat_history.sql`:
  - Table `public.chat_sessions`: `id uuid PK DEFAULT gen_random_uuid()`, `user_id uuid REFERENCES auth.users`, `created_at timestamptz DEFAULT now()`.
  - Table `public.chat_messages`: `id uuid PK DEFAULT gen_random_uuid()`, `session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE`, `role text CHECK (role IN ('user','bot'))`, `text text NOT NULL`, `intent text`, `created_at timestamptz DEFAULT now()`. Index on `(session_id, created_at)`.
  - RLS: `chat_sessions` — authenticated owner-read/write only. `chat_messages` — owner-read via session join.
- Add `chat_sessions` and `chat_messages` to `Database.public.Tables` in `types/api.ts`.
- Update `app/api/chat/route.ts` to: (1) create or retrieve a `chat_sessions` row for the authenticated user, (2) INSERT each incoming user message and each bot response into `chat_messages` after streaming is complete. Unauthenticated sessions are NOT persisted (anon chat is fine, no history saved).
- **Output:** Migration, updated `types/api.ts`, updated chat route.

### B-05 — Personalized Recommendations via pgvector
- New migration `db/migrations/20260301_0018_product_embeddings.sql`:
  - Enable `pgvector`: `CREATE EXTENSION IF NOT EXISTS vector;`
  - Add `embedding vector(1536)` column to `products` table (nullable — backfill runs separately).
  - Create `public.match_products(query_embedding vector, match_count int DEFAULT 6) RETURNS TABLE (id uuid, name text, slug text, price_cents int, similarity float)` SECURITY DEFINER RPC using `<=>` cosine distance operator.
  - Index: `CREATE INDEX IF NOT EXISTS products_embedding_idx ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`.
- New server utility `lib/utils/getProductEmbedding.ts`: calls the LLM embeddings API (OpenAI `text-embedding-3-small`, 1536 dims) using the `LLM_API_KEY` from `store_settings`. Returns `number[]`.
- New server action `lib/actions/recommendations.ts`: `getProductRecommendations(productId: string): Promise<ProductListItem[]>` — fetches the source product's `embedding`, calls `match_products` RPC, maps results to `ProductListItem` shape.
- **Output:** Migration, `lib/utils/getProductEmbedding.ts`, `lib/actions/recommendations.ts`, updated `types/api.ts`.

---

## Phase 2: Frontend (Delegate to @frontend-specialist)

### F-01 — Shadcn UI Primitives Installation
Install the following components via `npx shadcn@latest add` (one PR-safe batch):
```
button dialog input badge sheet toast dropdown-menu select skeleton tabs label separator
```
- After install, audit `components/ui/` for any hand-rolled duplicates of the above. Hand-rolled versions must be removed and importers updated to use the Shadcn path.
- `T3-08` fix: delete `components/ui/Badge.tsx` (PascalCase) if it exists as a separate physical file on the CI filesystem (Linux is case-sensitive). Confirm all imports use lowercase `'@/components/ui/badge'`.
- **Output:** All Shadcn primitives installed; `Badge.tsx` duplicate removed; all imports audited.

### F-02 — Personalized Recommendations UI
- `components/shop/ProductRecommendations.tsx` (new) — Server Component. Accepts `productId: string`. Calls `getProductRecommendations(productId)`. Renders a horizontal scroll strip of `ProductCard`s inside a `<Suspense>` with a `<RecommendationsSkeleton />` fallback (6 skeleton cards).
- `components/shop/RecommendationsSkeleton.tsx` (new) — 6 skeleton cards in a horizontal row.
- Update `app/(storefront)/shop/[slug]/page.tsx` to mount `<ProductRecommendations productId={product.id} />` below the reviews section.
- Note: embeddings backfill is NOT the frontend's job — recommendations will silently return 0 results until embeddings are populated server-side. The UI must handle the empty array gracefully (render nothing, no error).
- **Output:** Two new components; `[slug]/page.tsx` updated.

### F-03 — Chat History UI
- Update `components/chat/ChatWidget.tsx` to: on open (if user is authenticated), call `GET /api/chat/history` to load the last 20 messages of the most recent session and pre-populate `messages` state.
- New route `app/api/chat/history/route.ts`: authenticated GET — queries `chat_messages` joined to `chat_sessions` for the current user, ordered by `created_at ASC`, limit 20. Returns `{ messages: ChatMessage[] }`.
- Add new type `GET /api/chat/history` to `docs/api_contract.md`.
- **Output:** Updated `ChatWidget.tsx`, new history route, updated API contract doc.

---

## Phase 3: QA Integration (Delegate to @qa-integration)

1. Run `npx tsc --noEmit` — confirm 0 errors across all newly touched files.
2. Verify `types/api.ts` has correct inline object literal types (DECISION 48) for `chat_sessions` and `chat_messages` — NOT interface references.
3. Verify `app/api/chat/route.ts` — Redis fallback path is covered; ensure `@upstash/redis` import is not in any client component.
4. Verify `components/shop/ProductRecommendations.tsx` handles empty `[]` from `getProductRecommendations` without rendering or throwing.
5. Run `npm test` — all 11 Jest suites must still pass.
6. Audit all `components/ui/` imports after Shadcn install — confirm no file still imports the hand-rolled `Badge.tsx` (PascalCase).

---

## Definition of Done (Orchestrator Review)
- [x] `profiles` trigger migration is idempotent and deployment instructions are documented.
- [x] All 3 storage buckets have SQL-documented creation + RLS (`0016` migration).
- [x] `/api/chat` uses Upstash Redis rate limiter with in-memory fallback for dev; DECISION 40 upgraded → DECISION 49.
- [x] Chat sessions and messages are persisted in Supabase for authenticated users.
- [x] `pgvector` extension + `products.embedding` column + `match_products` RPC are migrated.
- [x] All Shadcn primitives installed; `Badge.tsx` PascalCase import fixed; Linux-safe imports confirmed.
- [x] `ProductRecommendations` server component renders on `/shop/[slug]`; handles empty gracefully.
- [x] Chat history loads on widget open for authenticated users.
- [x] `npx tsc --noEmit` reports 0 errors across all Sprint 12 files.
- [x] `npm test` passes all 11 suites.
- [x] `docs/MEMORY.md` updated with ADR 49–52 and Sprint 12 log.
