# API Contract — TypeScript Interfaces

/*
  Notes:
  - These interfaces map 1:1 to the DB tables created in migrations.
  - UUIDs are represented as `string`.
  - Timestamps are ISO strings (`string`).
  - JSONB fields are represented as `Record<string, unknown>` when structured, else a generic object.
  - RLS expectations: `store_settings` is admin-only (read/write). Server-side operations should use the service role.
*/

export type UUID = string;
export type Timestamptz = string; // ISO 8601

export type UserRole = 'admin' | 'customer';
export type DropStatus = 'upcoming' | 'active' | 'closed';
export type PostStatus = 'draft' | 'published';

export interface Profile {
  id: UUID;
  email?: string | null;
  display_name?: string | null;
  role: UserRole;
  created_at: Timestamptz;
}

export interface Category {
  id: UUID;
  name: string;
  slug: string;
  metadata: Record<string, unknown>;
  created_at: Timestamptz;
}

export interface Drop {
  id: UUID;
  name: string;
  start_at?: Timestamptz | null;
  end_at?: Timestamptz | null;
  status: DropStatus;
  created_at: Timestamptz;
}

export interface Product {
  id: UUID;
  sku?: string | null;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  inventory_count: number;
  category_id?: UUID | null;
  drop_id?: UUID | null;
  metadata: Record<string, unknown>;
  created_at: Timestamptz;
}

export interface BlogPost {
  id: UUID;
  title: string;
  slug: string;
  content?: Record<string, unknown> | null; // JSONB content
  author_id?: UUID | null;
  published_at?: Timestamptz | null;
  status: PostStatus;
  created_at: Timestamptz;
}

export interface Review {
  id: UUID;
  product_id: UUID;
  author_id?: UUID | null;
  rating: number; // smallint (1-5)
  comment?: string | null;
  verified_purchase: boolean;
  created_at: Timestamptz;
}

export interface StoreSetting {
  id: number;
  key: string;
  value: string; // stored as plaintext here; RLS enforces admin only
  created_at: Timestamptz;
}

export interface ApiContract {
  profiles: Profile;
  categories: Category;
  drops: Drop;
  products: Product;
  blog_posts: BlogPost;
  reviews: Review;
  store_settings: StoreSetting; // Admin-only via RLS
}

/* RLS notes for frontend integrators:
 - `store_settings` should not be requested from client-side code unless the user is an admin.
 - Use server-side endpoints (with the Supabase service role) for operations that require admin privileges.
 - Public storefront reads (products, categories, drops, published blog_posts) are allowed for authenticated users.
/* Additional Backend Deliverables (Sprint 2)
 *
 * 1) Profiles auto-creation trigger
 *    - When a new row is inserted into `auth.users`, the DB trigger
 *      `public.create_profile_after_auth_user()` will ensure a matching
 *      `public.profiles` row exists with `role = 'customer'` by default.
 *    - Server integrators: no extra server calls are required to create
 *      profiles; the trigger runs inside Postgres. If you rely on profile
 *      metadata shortly after signup, consider short retries on reads due to
 *      transactional propagation in some environments.
 *
 * 2) RPC: `search_products(query text, limit int)`
 *    - Returns product rows matching the `name` or `description` using
 *      Postgres full-text search (`to_tsvector`). Example SQL (server-side):
 */

/*
CREATE OR REPLACE FUNCTION public.search_products(q text, limit int DEFAULT 25)
RETURNS SETOF public.products
LANGUAGE sql STABLE
AS $$
  SELECT p.*
  FROM public.products p
  WHERE (
    to_tsvector('simple', coalesce(p.name, '')) || to_tsvector('simple', coalesce(p.description, ''))
  ) @@ plainto_tsquery('simple', q)
  ORDER BY ts_rank(
    to_tsvector('simple', coalesce(p.name, '')) || to_tsvector('simple', coalesce(p.description, '')),
    plainto_tsquery('simple', q)
  ) DESC
  LIMIT coalesce(limit, 25);
$$;
*/

## Public Catalog API

This section documents the server-side Server Actions implemented at `lib/actions/catalog.ts`.

- `getCategories(): Promise<CategoryListItem[]>`
  - Returns categories with fields: `id: string`, `name: string`, `slug: string`.

- `getPublishedProducts(opts?: { categorySlug?: string; sort?: 'price_asc'|'price_desc'|'newest'; limit?: number; offset?: number; query?: string }): Promise<ProductListItem[]>`
  - Returns products where `status = 'published'`.
  - Each item includes: `id, name, slug, price_cents, currency, metadata -> images (signed URLs), category: {id,name,slug}, drop: {id,name,start_at,end_at,status}`.
  - Supports server-side pagination (`limit`/`offset`), optional category filtering, optional sorting, and optional full-text `query` (uses `to_tsvector` when available).

- `getActiveAndUpcomingDrops(): Promise<DropListItem[]>`
  - Returns drops where `end_at > now()` OR `start_at > now()`, ordered by `start_at`.
  - Each item: `id, name, start_at, end_at, status`.

- `getProductBySlug(slug: string): Promise<ProductDetail | null>`
  - Returns full product detail for the given slug. Includes `inventory_count` (server-only), parsed `metadata` with `variants` and `images` (signed URLs), and related `category` and `drop` objects.

Note: These Server Actions never return admin-only fields (e.g., `cost_price`). Image storage keys are signed server-side and the public responses include short-lived signed URLs (15 minutes).

Security & Performance Notes:
- All filtering, pagination and searching is executed server-side and selects only necessary columns (avoid `SELECT *`).
- When `query` is provided, the actions prefer Postgres full-text search (`to_tsvector`) to leverage DB indexes. Otherwise they use indexed filters (e.g., category id) for performance.
- These endpoints are good candidates for short TTL edge caching (e.g., 60s) to reduce DB load during high-traffic drops.


/* 3) Server Action / TypeScript shapes (callable from Next.js Server Actions)
 *    - These actions should be implemented server-side and use the
 *      Supabase service role key. Examples below describe the TypeScript
 *      parameter/result shapes for the admin UI.
 */

export type SearchProductsParams = { query: string; limit?: number };
export type SearchProductsResult = Product[];

export type EncryptSettingParams = { key: string; value: string };
export type EncryptSettingResult = { id: number; key: string; value_encrypted: string };

/* Encryption utility
 * - `lib/encryption.ts` provides `encryptSettings(value)` and `decryptSettings(ciphertextB64)`.
 * - These are server-only (use service role) and require SETTINGS_ENCRYPTION_KEY env var.
 */

/* Deployment notes:
 * - Implement server actions (Next.js Server Actions or API routes) that call
 *   these RPCs and utilities using a Supabase client initialized with the
 *   service role key. RLS will not apply to service-role operations.
 */
*/
