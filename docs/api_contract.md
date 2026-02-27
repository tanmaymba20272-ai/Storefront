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
*/
