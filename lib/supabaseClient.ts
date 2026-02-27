import { createClient, SupabaseClient } from '@supabase/supabase-js'

let serverSupabase: SupabaseClient | null = null

export function getServerSupabase() {
  if (serverSupabase) return serverSupabase
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_ANON_KEY || ''
  serverSupabase = createClient(url, key)
  return serverSupabase
}

export default getServerSupabase()
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type {
  Profile,
  Category,
  Drop,
  Product,
  BlogPost,
  Review,
  StoreSetting,
} from '../types/api'

// Minimal Database type for typed Supabase client generics
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

const url: string = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!url || !anonKey) {
  // Do not throw — allow build but surface missing envs in runtime behavior.
  // This is intentionally non-fatal to allow CI/static checks without secrets.
  // Runtime usage should ensure env vars are present.
  // eslint-disable-next-line no-console
  console.warn('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey)

export default supabase
