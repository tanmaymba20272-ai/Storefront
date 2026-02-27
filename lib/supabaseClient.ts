import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type {
  Profile,
  Category,
  Drop,
  Product,
  BlogPost,
  Review,
  StoreSetting,
  Order,
} from '../types/api'

// ---------------------------------------------------------------------------
// Database type — single source of truth for all Supabase client generics
// ---------------------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile }
      categories: { Row: Category }
      drops: { Row: Drop }
      products: { Row: Product }
      blog_posts: { Row: BlogPost }
      reviews: { Row: Review }
      store_settings: { Row: StoreSetting }
      orders: { Row: Order }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ---------------------------------------------------------------------------
// Browser / client-side Supabase client (anon key, NEXT_PUBLIC_* vars)
// Safe to import in client components.
// ---------------------------------------------------------------------------
const clientUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const clientAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!clientUrl || !clientAnonKey) {
  // Non-fatal — allows static builds/CI to pass without secrets.
  // Runtime usage requires both vars to be present.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] Missing env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  clientUrl,
  clientAnonKey
)

// ---------------------------------------------------------------------------
// Server-side Supabase client factory (anon key, server-only vars)
// Use in Server Actions and API routes. Never import in client components.
// ---------------------------------------------------------------------------
let _serverSupabase: SupabaseClient<Database> | null = null

export function getServerSupabase(): SupabaseClient<Database> {
  if (_serverSupabase) return _serverSupabase
  const url = process.env.SUPABASE_URL ?? ''
  // Prefer service role key for server-side privileged operations
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''
  if (!url || !key) {
    // eslint-disable-next-line no-console
    console.warn('[getServerSupabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  _serverSupabase = createClient<Database>(url, key)
  return _serverSupabase
}

export default supabase
