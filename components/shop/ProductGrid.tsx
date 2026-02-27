import React from 'react'
import ProductCard from '../ProductCard'
import type { ProductListItem } from '../../lib/actions/catalog'

interface ProductGridProps {
  products: ProductListItem[]
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="col-span-full py-16 text-center font-sans text-stone">
        No products found.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
