import { Suspense } from 'react'
import { getProductRecommendations } from '@/lib/actions/recommendations'
import ProductCard from '@/components/ProductCard'
import RecommendationsSkeleton from './RecommendationsSkeleton'

interface ProductRecommendationsProps {
  productId: string
}

export default async function ProductRecommendations({
  productId,
}: ProductRecommendationsProps) {
  return (
    <Suspense fallback={<RecommendationsSkeleton />}>
      <ProductRecommendationsContent productId={productId} />
    </Suspense>
  )
}

async function ProductRecommendationsContent({
  productId,
}: ProductRecommendationsProps) {
  const recommendations = await getProductRecommendations(productId)

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  return (
    <section className="mt-12 space-y-4">
      <h2 className="text-2xl font-serif font-bold text-navy mb-6">
        You Might Also Like
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {recommendations.slice(0, 6).map((product) => (
          <div key={product.id} className="flex-shrink-0 w-[200px] sm:w-[240px]">
            <ProductCard
              name={product.name}
              price_cents={product.price_cents}
              image={
                product.metadata?.images?.[0]
                  ? (product.metadata.images[0] as string)
                  : undefined
              }
              slug={product.slug ?? '#'}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
