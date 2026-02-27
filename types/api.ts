export type UUID = string
export type Timestamptz = string

export type UserRole = 'admin' | 'customer'
export type DropStatus = 'upcoming' | 'active' | 'closed'
export type PostStatus = 'draft' | 'published'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'abandoned' | 'delivered' | 'cancelled'
export type ProductStatus = 'active' | 'inactive' | 'archived'

// ---------------------------------------------------------------------------
// Domain interfaces — used throughout application code.
// These are intentionally kept separate from the Database type below.
// ---------------------------------------------------------------------------

export interface Profile {
  id: UUID
  email?: string | null
  display_name?: string | null
  role: UserRole
  marketing_opt_in?: boolean | null
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
  handle?: string | null
  metadata: Record<string, unknown>
  updated_at?: Timestamptz | null
  created_at: Timestamptz
}

/** Order row — intentionally omits cost_price and internal_notes (admin-only fields). */
export interface Order {
  id: UUID
  user_id: UUID
  email?: string | null
  razorpay_order_id?: string | null
  status: OrderStatus
  amount_paise: number
  currency: string
  items?: Record<string, unknown>[] | null
  shipping_address?: Record<string, unknown> | null
  shiprocket_order_id?: string | null
  shipment_id?: string | null
  awb_code?: string | null
  courier_name?: string | null
  label_url?: string | null
  fulfillment_status: string
  external_tracking_code?: string | null
  paid_at?: Timestamptz | null
  created_at: Timestamptz
}

export interface ProductVariant {
  id: UUID
  product_id: UUID
  sku: string
  title?: string | null
  price_cents: number
  currency: string
  inventory_count?: number | null
  metadata?: Record<string, unknown> | null
  created_at: Timestamptz
}

export interface ShiprocketWebhookLog {
  id: UUID
  shiprocket_event: string | Record<string, unknown>
  order_id?: UUID | null
  shiprocket_order_id?: string | null
  awb_code?: string | null
  created_at: Timestamptz
}

export interface BlogPost {
  id: UUID
  title: string
  slug: string
  excerpt?: string | null
  cover_image?: string | null
  content?: Record<string, unknown> | null
  author_id?: UUID | null
  published_at?: Timestamptz | null
  updated_at?: Timestamptz | null
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

// ---------------------------------------------------------------------------
// Database type — compatible with @supabase/supabase-js v2 / postgrest-js v12.
//
// CRITICAL (DECISION 42): All Row/Insert/Update entries MUST be inline object
// literal types, NOT references to named interfaces. Named interface types
// without an explicit index signature do not satisfy the GenericTable
// { Row: Record<string, unknown> } constraint in postgrest-js v12, causing
// every table and RPC to fall back to `never` / `undefined`.
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          role: 'admin' | 'customer'
          marketing_opt_in: boolean | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          role?: 'admin' | 'customer'
          marketing_opt_in?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          role?: 'admin' | 'customer'
          marketing_opt_in?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      drops: {
        Row: {
          id: string
          name: string
          start_at: string | null
          end_at: string | null
          status: 'upcoming' | 'active' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_at?: string | null
          end_at?: string | null
          status?: 'upcoming' | 'active' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_at?: string | null
          end_at?: string | null
          status?: 'upcoming' | 'active' | 'closed'
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          sku: string | null
          name: string
          slug: string | null
          status: 'active' | 'inactive' | 'archived' | null
          description: string | null
          price_cents: number
          currency: string
          inventory_count: number
          category_id: string | null
          drop_id: string | null
          handle: string | null
          metadata: Record<string, unknown>
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sku?: string | null
          name: string
          slug?: string | null
          status?: 'active' | 'inactive' | 'archived' | null
          description?: string | null
          price_cents: number
          currency: string
          inventory_count?: number
          category_id?: string | null
          drop_id?: string | null
          handle?: string | null
          metadata?: Record<string, unknown>
          updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sku?: string | null
          name?: string
          slug?: string | null
          status?: 'active' | 'inactive' | 'archived' | null
          description?: string | null
          price_cents?: number
          currency?: string
          inventory_count?: number
          category_id?: string | null
          drop_id?: string | null
          handle?: string | null
          metadata?: Record<string, unknown>
          updated_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          title: string | null
          price_cents: number
          currency: string
          inventory_count: number | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          sku: string
          title?: string | null
          price_cents: number
          currency: string
          inventory_count?: number | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          sku?: string
          title?: string | null
          price_cents?: number
          currency?: string
          inventory_count?: number | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          cover_image: string | null
          content: Record<string, unknown> | null
          author_id: string | null
          published_at: string | null
          updated_at: string | null
          status: 'draft' | 'published'
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          cover_image?: string | null
          content?: Record<string, unknown> | null
          author_id?: string | null
          published_at?: string | null
          updated_at?: string | null
          status?: 'draft' | 'published'
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          cover_image?: string | null
          content?: Record<string, unknown> | null
          author_id?: string | null
          published_at?: string | null
          updated_at?: string | null
          status?: 'draft' | 'published'
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          author_id: string | null
          rating: number
          comment: string | null
          verified_purchase: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          author_id?: string | null
          rating: number
          comment?: string | null
          verified_purchase?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          author_id?: string | null
          rating?: number
          comment?: string | null
          verified_purchase?: boolean
          created_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: number
          key: string
          value: string
          created_at: string
        }
        Insert: {
          id?: number
          key: string
          value: string
          created_at?: string
        }
        Update: {
          id?: number
          key?: string
          value?: string
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          user_id: string
          email: string | null
          razorpay_order_id: string | null
          status: 'pending' | 'paid' | 'failed' | 'refunded' | 'abandoned' | 'delivered' | 'cancelled'
          amount_paise: number
          currency: string
          items: Record<string, unknown>[] | null
          shipping_address: Record<string, unknown> | null
          shiprocket_order_id: string | null
          shipment_id: string | null
          awb_code: string | null
          courier_name: string | null
          label_url: string | null
          fulfillment_status: string
          external_tracking_code: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          razorpay_order_id?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'abandoned' | 'delivered' | 'cancelled'
          amount_paise: number
          currency?: string
          items?: Record<string, unknown>[] | null
          shipping_address?: Record<string, unknown> | null
          shiprocket_order_id?: string | null
          shipment_id?: string | null
          awb_code?: string | null
          courier_name?: string | null
          label_url?: string | null
          fulfillment_status?: string
          external_tracking_code?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          razorpay_order_id?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'abandoned' | 'delivered' | 'cancelled'
          amount_paise?: number
          currency?: string
          items?: Record<string, unknown>[] | null
          shipping_address?: Record<string, unknown> | null
          shiprocket_order_id?: string | null
          shipment_id?: string | null
          awb_code?: string | null
          courier_name?: string | null
          label_url?: string | null
          fulfillment_status?: string
          external_tracking_code?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      shiprocket_webhook_logs: {
        Row: {
          id: string
          shiprocket_event: string
          order_id: string | null
          shiprocket_order_id: string | null
          awb_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shiprocket_event: string
          order_id?: string | null
          shiprocket_order_id?: string | null
          awb_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shiprocket_event?: string
          order_id?: string | null
          shiprocket_order_id?: string | null
          awb_code?: string | null
          created_at?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'bot'
          text: string
          intent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'bot'
          text: string
          intent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'bot'
          text?: string
          intent?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      decrement_inventory: {
        Args: { product_id: string; qty: number }
        Returns: boolean
      }
      validate_cart: {
        Args: { items: Record<string, unknown>[]; customer_id?: string | null }
        Returns: Record<string, unknown>
      }
      reserve_inventory: {
        Args: { cart_items: Record<string, unknown>[]; order_id: string }
        Returns: Record<string, unknown>
      }
      release_reservation: {
        Args: { p_order_id: string }
        Returns: null
      }
      finalize_inventory: {
        Args: { order_uuid: string }
        Returns: null
      }
      fail_order: {
        Args: { order_uuid: string }
        Returns: null
      }
      get_product_reviews: {
        Args: { product_uuid: string; limit_rows: number; offset_rows: number }
        Returns: Record<string, unknown>[]
      }
      inventory_ttl_release: {
        Args: Record<PropertyKey, never>
        Returns: null
      }
      match_products: {
        Args: { query_embedding: string; match_count: number }
        Returns: {
          id: string
          name: string
          slug: string
          price_cents: number
          similarity: number
        }[]
      }
    }
    Enums: {
      post_status: 'draft' | 'published'
      user_role: 'admin' | 'customer'
      drop_status: 'upcoming' | 'active' | 'closed'
      order_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'abandoned' | 'delivered' | 'cancelled'
      product_status: 'active' | 'inactive' | 'archived'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export interface ApiContract {
  profiles: Profile
  categories: Category
  drops: Drop
  products: Product
  posts: BlogPost
  reviews: Review
  store_settings: StoreSetting
}

