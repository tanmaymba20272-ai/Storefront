import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/api'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const DEFAULT_PRODUCT_IMAGE = process.env.DEFAULT_PRODUCT_IMAGE ?? ''
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'product-images'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Non-fatal at module load to avoid build crashes in environments
  // where server-only secrets are not present (e.g., static checks/CI).
  // Functions that require the admin client will still fail at runtime
  // with clear errors when used without proper env vars.
  // eslint-disable-next-line no-console
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; supabaseAdmin may be non-functional at runtime')
}

const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Caching guidance: responses from these actions are good candidates for
// edge cache (Vercel/Supabase Edge) with a short TTL (e.g., 60s).

/* Types returned by the public catalog API */
export interface CategoryListItem {
  id: string
  name: string
  slug: string
}

export interface Variant {
  id: string
  sku: string
  title?: string
  price_cents: number
  currency: string
  metadata?: Record<string, unknown>
}

export interface DropListItem {
  id: string
  name: string
  start_at: string
  end_at: string
  status: string
}

export interface ProductListItem {
  id: string
  name: string
  slug: string
  price_cents: number
  currency: string
  metadata: {
    images: string[]
    [k: string]: unknown
  }
  category: CategoryListItem | null
  drop: DropListItem | null
}

export interface ProductDetail extends ProductListItem {
  description?: string | null
  inventory_count?: number | null
  variants?: Variant[]
}

async function resolveImageUrls(images: string[] | null | undefined) : Promise<string[]> {
  const list = images ?? []
  if (list.length === 0) return DEFAULT_PRODUCT_IMAGE ? [DEFAULT_PRODUCT_IMAGE] : []

  const signed = await Promise.all(list.map(async (key) => {
    // key format expected: "bucket/path/to/object.jpg" OR "path/inside-bucket.jpg"
    const parts = key.split('/')
    let bucket = SUPABASE_STORAGE_BUCKET
    let path = key
    if (parts.length > 1) {
      // assume first segment is bucket name
      bucket = parts[0]
      path = parts.slice(1).join('/')
    }

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 15)

      if (error || !data?.signedUrl) return DEFAULT_PRODUCT_IMAGE
      return data.signedUrl
    } catch (e) {
      return DEFAULT_PRODUCT_IMAGE
    }
  }))

  return signed.filter(Boolean) as string[]
}

export async function getCategories(): Promise<CategoryListItem[]> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as CategoryListItem[]
}

/** Raw DB row shape returned by the getPublishedProducts select query. */
interface ProductRow {
  id: string
  name: string
  slug: string
  price_cents: number
  currency: string
  metadata: Record<string, unknown> | null
  category: CategoryListItem | null
  drop: DropListItem | null
}

export async function getPublishedProducts(opts?: {
  categorySlug?: string
  sort?: 'price_asc' | 'price_desc' | 'newest'
  limit?: number
  offset?: number
  query?: string
}): Promise<ProductListItem[]> {
  const limit = opts?.limit ?? 20
  const offset = opts?.offset ?? 0

  // If categorySlug provided, resolve its id first (indexed look up)
  let categoryId: string | undefined
  if (opts?.categorySlug) {
    const { data: cat, error: catErr } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', opts.categorySlug)
      .limit(1)
      .single()
    if (catErr) throw catErr
    categoryId = cat?.id
  }

  // Build base query selecting only required fields and related tables
  let query = supabaseAdmin
    .from('products')
    .select(
      `id, name, slug, price_cents, currency, metadata, category:categories(id,name,slug), drop:drops(id,name,start_at,end_at,status)`
    )
    .eq('status', 'active')

  if (categoryId) query = query.eq('category_id', categoryId)

  if (opts?.query) {
    // Use full-text search via to_tsvector on indexed text columns. This hits the DB server-side.
    // The actual RPC/query uses Postgres function; supabase-js allows raw filters via .filter
    // Use .textSearch when available; fallback to .ilike for portability.
    try {
      query = query.textSearch('name', opts.query)
    } catch {
      query = query.ilike('name', `%${opts.query}%`)
    }
  }

  if (opts?.sort === 'price_asc') query = query.order('price_cents', { ascending: true })
  else if (opts?.sort === 'price_desc') query = query.order('price_cents', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as ProductRow[]

  // Resolve image URLs server-side and map to the public shape
  const results: ProductListItem[] = await Promise.all(rows.map(async (r) => {
    const images = await resolveImageUrls((r.metadata && (r.metadata.images as string[])) ?? [])
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      price_cents: r.price_cents,
      currency: r.currency,
      metadata: { ...r.metadata, images },
      category: r.category ?? null,
      drop: r.drop ?? null,
    }
  }))

  return results
}

export async function getActiveAndUpcomingDrops(): Promise<DropListItem[]> {
  const now = new Date().toISOString()
  // select only needed columns
  const { data, error } = await supabaseAdmin
    .from('drops')
    .select('id, name, start_at, end_at, status')
    .or(`end_at.gt.${now},start_at.gt.${now}`)
    .order('start_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as DropListItem[]
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(
      `id, name, slug, price_cents, currency, description, metadata, inventory_count, category:categories(id,name,slug), drop:drops(id,name,start_at,end_at,status)`
    )
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const images = await resolveImageUrls((data.metadata && (data.metadata.images as string[])) ?? [])

  // load variants if table exists
  const { data: variants, error: varErr } = await supabaseAdmin
    .from('product_variants')
    .select('id, sku, title, price_cents, currency, metadata')
    .eq('product_id', data.id)

  if (varErr) throw varErr

  /** Raw row shape returned by the product_variants select query. */
  interface VariantRow {
    id: string
    sku: string
    title: string | null
    price_cents: number
    currency: string
    metadata: Record<string, unknown> | null
  }

  const mappedVariants: Variant[] = (variants ?? []).map((v: VariantRow) => ({
    id: v.id,
    sku: v.sku,
    title: v.title ?? undefined,
    price_cents: v.price_cents,
    currency: v.currency,
    metadata: v.metadata ?? undefined,
  }))

  const detail: ProductDetail = {
    id: data.id,
    name: data.name,
    slug: data.slug ?? '',
    price_cents: data.price_cents,
    currency: data.currency,
    metadata: { ...(data.metadata ?? {}), images },
    category: (data.category as unknown) as CategoryListItem | null,
    drop: (data.drop as unknown) as DropListItem | null,
    description: data.description ?? null,
    inventory_count: data.inventory_count ?? null,
    variants: mappedVariants,
  }

  return detail
}

export default {
  getCategories,
  getPublishedProducts,
  getActiveAndUpcomingDrops,
  getProductBySlug,
}
