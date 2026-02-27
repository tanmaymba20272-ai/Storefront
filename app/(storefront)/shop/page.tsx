import React, { Suspense } from 'react'
import { getPublishedProducts, getCategories } from '../../../lib/actions/catalog'
import type { ProductListItem } from '../../../lib/actions/catalog'
import ProductGrid from '../../../components/shop/ProductGrid'
import CategoryFilter from '../../../components/shop/CategoryFilter'
import SortDropdown from '../../../components/shop/SortDropdown'
import ShopGridSkeleton from '../../../components/shop/ShopGridSkeleton'

interface ShopPageProps {
  searchParams: Promise<{ category?: string; sort?: string }>
}

export const metadata = {
  title: 'Shop — Old Money',
  description: 'Browse our curated collection of sustainable, premium garments.',
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category, sort } = await searchParams

  const sortParam =
    sort === 'price_asc' || sort === 'price_desc' || sort === 'newest'
      ? (sort as 'price_asc' | 'price_desc' | 'newest')
      : 'newest'

  const [products, categories] = await Promise.all([
    getPublishedProducts({ categorySlug: category, sort: sortParam }),
    getCategories(),
  ])

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-serif text-4xl text-navy">Shop</h1>
          <p className="mt-1 font-sans text-sm text-stone">
            Timeless pieces, consciously made.
          </p>
        </header>

        <div className="flex items-start justify-between gap-4">
          <CategoryFilter categories={categories} />
          <SortDropdown />
        </div>

        <div className="mt-8">
          <Suspense fallback={<ShopGridSkeleton />}>
            <ProductGridWrapper products={products} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function ProductGridWrapper({ products }: { products: ProductListItem[] }) {
  return <ProductGrid products={products} />
}
