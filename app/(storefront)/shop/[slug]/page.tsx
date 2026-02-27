import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getProductBySlug, getPublishedProducts } from '../../../../lib/actions/catalog'
import ProductImageGallery from '../../../../components/ProductImageGallery'
import VariantSelector from '../../../../components/products/VariantSelector'
import AddToCartButton from '../../../../components/products/AddToCartButton'
import type { Variant } from '../../../../lib/actions/catalog'

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const products = await getPublishedProducts()
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}
  return {
    title: `${product.name} — Old Money`,
    description: product.description ?? undefined,
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) notFound()

  const images = product.metadata.images
  const variants: Variant[] = product.variants ?? []
  const inventoryCount = product.inventory_count ?? null

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-screen-xl px-4 py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* Left — image gallery */}
          <Suspense fallback={<div className="aspect-[4/5] w-full animate-pulse rounded-xl bg-stone/20" />}>
            <ProductImageGallery images={images} productName={product.name} />
          </Suspense>

          {/* Right — product info */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-serif text-3xl text-navy">{product.name}</h1>
              <p className="mt-2 font-sans text-2xl font-medium text-gold">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: product.currency.toUpperCase(),
                  minimumFractionDigits: 0,
                }).format(product.price_cents / 100)}
              </p>
            </div>

            {/* Stock indicator */}
            {inventoryCount !== null && (
              <div>
                {inventoryCount === 0 ? (
                  <span className="font-sans text-sm font-semibold text-red-600">Sold Out</span>
                ) : inventoryCount <= 10 ? (
                  <span className="font-sans text-sm text-red-600">
                    Only {inventoryCount} left
                  </span>
                ) : null}
              </div>
            )}

            {/* Variants */}
            {variants.length > 0 && (
              <VariantSelectorWrapper variants={variants} images={images} product={product} />
            )}

            {/* Description */}
              {product.description && (
                <div
                  className="prose prose-sm max-w-none font-sans text-charcoal"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}
              {/* Reviews feed */}
              <div className="mt-8">
                <ProductReviews productId={product.id} />
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Client island wrapping variant selection + add-to-cart so that both
 * interactive components share the selected-variant state.
 */
import VariantAndCart from '../../../../components/products/VariantAndCart'
import ReviewsList from '../../../../components/reviews/ReviewsList'
import { getServerSupabase } from '../../../../lib/supabaseClient'

function VariantSelectorWrapper({
  variants,
  images,
  product,
}: {
  variants: Variant[]
  images: string[]
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>
}) {
  return (
    <VariantAndCart
      variants={variants}
      productId={product.id}
      productName={product.name}
      priceCents={product.price_cents}
      image={images[0] ?? null}
    />
  )
}

/**
 * Server component that fetches product reviews and renders ReviewsList in a client island
 */
async function ProductReviews({ productId }: { productId: string }) {
  const supabase = getServerSupabase()
  try {
    const { data, error } = await supabase.rpc('get_product_reviews', { product_uuid: productId, limit_rows: 20, offset_rows: 0 })
    if (error) throw error
    const reviews = (data ?? []) as any[]
    return (
      <Suspense fallback={<div className="mt-6 animate-pulse rounded bg-stone-100 p-6" /> }>
        {/* ReviewsList is a client component */}
        <ReviewsList reviews={reviews} />
      </Suspense>
    )
  } catch (_err) {
    return <div className="mt-6 text-sm text-stone-500">Unable to load reviews</div>
  }
}
