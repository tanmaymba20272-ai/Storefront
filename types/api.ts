export type UUID = string
export type Timestamptz = string

export type UserRole = 'admin' | 'customer'
export type DropStatus = 'upcoming' | 'active' | 'closed'
export type PostStatus = 'draft' | 'published'

export interface Profile {
  id: UUID
  email?: string | null
  display_name?: string | null
  role: UserRole
  created_at: Timestamptz
}

export interface Category {
  id: UUID
  name: string
  slug: string
  metadata: Record<string, unknown>
  created_at: Timestamptz
}

export interface Drop {
  id: UUID
  name: string
  start_at?: Timestamptz | null
  end_at?: Timestamptz | null
  status: DropStatus
  created_at: Timestamptz
}

export type ProductStatus = 'active' | 'inactive' | 'archived'

export interface Product {
  id: UUID
  sku?: string | null
  name: string
  slug?: string | null
  status?: ProductStatus | null
  description?: string | null
  price_cents: number
  currency: string
  inventory_count: number
  category_id?: UUID | null
  drop_id?: UUID | null
  metadata: Record<string, unknown>
  created_at: Timestamptz
}

/** Order row — intentionally omits cost_price and internal_notes (admin-only fields). */
export interface Order {
  id: UUID
  user_id: UUID
  email?: string | null
  shiprocket_order_id?: string | null
  fulfillment_status: string
  created_at: Timestamptz
}

export interface BlogPost {
  id: UUID
  title: string
  slug: string
  content?: Record<string, unknown> | null
  author_id?: UUID | null
  published_at?: Timestamptz | null
  status: PostStatus
  created_at: Timestamptz
}

export interface Review {
  id: UUID
  product_id: UUID
  author_id?: UUID | null
  rating: number
  comment?: string | null
  verified_purchase: boolean
  created_at: Timestamptz
}

export interface StoreSetting {
  id: number
  key: string
  value: string
  created_at: Timestamptz
}

export interface ApiContract {
  profiles: Profile
  categories: Category
  drops: Drop
  products: Product
  blog_posts: BlogPost
  reviews: Review
  store_settings: StoreSetting
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at'> & { id?: UUID; created_at?: Timestamptz }
        Update: Partial<Profile>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'> & { id?: UUID; created_at?: Timestamptz }
        Update: Partial<Category>
      }
      drops: {
        Row: Drop
        Insert: Omit<Drop, 'id' | 'created_at'> & { id?: UUID; created_at?: Timestamptz }
        Update: Partial<Drop>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at'> & { id?: UUID; created_at?: Timestamptz }
        Update: Partial<Product>
      }
      blog_posts: {
        Row: BlogPost
        Insert: Omit<BlogPost, 'id' | 'created_at'> & { id?: UUID; created_at?: Timestamptz }
        Update: Partial<BlogPost>
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at'> & { id?: UUID; created_at?: Timestamptz }
        Update: Partial<Review>
      }
      store_settings: {
        Row: StoreSetting
        Insert: Omit<StoreSetting, 'id' | 'created_at'> & { id?: number; created_at?: Timestamptz }
        Update: Partial<StoreSetting>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at'> & { id?: UUID; created_at?: Timestamptz }
        Update: Partial<Order>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      post_status: PostStatus
    }
  }
}
