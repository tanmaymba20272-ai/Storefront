'use server'

import { getServerSupabase } from '../../lib/supabaseClient'
import type { ProductListItem } from '../../lib/actions/catalog'

/**
 * Server action: Get personalized product recommendations based on semantic similarity.
 *
 * This action:
 * 1. Fetches the source product by ID
 * 2. If the product has no embedding, returns empty array (embeddings not yet backfilled)
 * 3. Otherwise, calls public.match_products RPC to find similar products
 * 4. Maps results to ProductListItem shape with resolved image URLs
 *
 * @param productId The UUID of the product to get recommendations for
 * @returns Promise<ProductListItem[]> — Similar products, ordered by similarity
 */
export async function getProductRecommendations(
  productId: string
): Promise<ProductListItem[]> {
  try {
    const supabase = getServerSupabase()

    // Fetch the source product to check if embedding exists
    const { data: sourceProduct, error: fetchErr } = await supabase
      .from('products')
      .select('embedding')
      .eq('id', productId)
      .single()

    if (fetchErr || !sourceProduct) {
      return [] // Product not found or error — return empty gracefully
    }

    // If embedding is not yet populated, return empty (backfill not complete)
    if (!sourceProduct.embedding) {
      return []
    }

    // Call match_products RPC with the source product's embedding
    const { data: matches, error: rpcErr } = await supabase.rpc(
      'match_products',
      {
        query_embedding: sourceProduct.embedding,
        match_count: 6,
      }
    )

    if (rpcErr || !matches || !Array.isArray(matches)) {
      return [] // RPC failed — return empty gracefully
    }

    // Helper to resolve image URLs server-side (mirrors logic from lib/actions/catalog.ts)
    const resolveImageUrls = async (images: string[] | null | undefined): Promise<string[]> => {
      const DEFAULT_PRODUCT_IMAGE = process.env.DEFAULT_PRODUCT_IMAGE ?? ''
      const list = images ?? []
      if (list.length === 0) return DEFAULT_PRODUCT_IMAGE ? [DEFAULT_PRODUCT_IMAGE] : []

      const signed = await Promise.all(
        list.map(async (key) => {
          const parts = key.split('/')
          let bucket = 'product-images'
          let path = key
          if (parts.length > 1) {
            bucket = parts[0]!
            path = parts.slice(1).join('/')
          }

          try {
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(path, 60 * 15) // 15-minute signed URL

            if (error || !data?.signedUrl) return DEFAULT_PRODUCT_IMAGE
            return data.signedUrl
          } catch (_e) {
            return DEFAULT_PRODUCT_IMAGE
          }
        })
      )

      return signed.filter(Boolean) as string[]
    }

    // Fetch full product details for recommended items
    // We have match_products result with id, name, slug, price_cents, similarity
    // Now fetch full product rows including metadata for image resolution
    const matchIds = (matches as Array<{ id: string }>).map((m) => m.id)
    if (matchIds.length === 0) return []

    const { data: fullProducts, error: fullErr } = await supabase
      .from('products')
      .select(
        'id, name, slug, price_cents, currency, metadata, category:categories(id,name,slug), drop:drops(id,name,start_at,end_at,status)'
      )
      .in('id', matchIds)
      .eq('status', 'active')

    if (fullErr || !fullProducts || fullProducts.length === 0) {
      return []
    }

    // Map to ProductListItem shape with resolved image URLs
    const results: ProductListItem[] = await Promise.all(
      fullProducts.map(async (p) => {
        const images = await resolveImageUrls(
          (p.metadata && (p.metadata.images as string[] | undefined)) ?? []
        )
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price_cents: p.price_cents,
          currency: p.currency || 'INR',
          metadata: { ...p.metadata, images },
          category: (p.category as unknown) ?? null,
          drop: (p.drop as unknown) ?? null,
        }
      })
    )

    return results
  } catch (_error) {
    // Log error server-side if needed (TODO: wire to observability)
    return [] // Fail gracefully — recommendations are nice-to-have, not critical
  }
}
