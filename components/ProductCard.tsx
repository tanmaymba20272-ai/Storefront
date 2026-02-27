import React from 'react'
import Link from 'next/link'
import Badge from './ui/Badge'

type Product = {
  id: string
  name: string
  slug: string
  price_cents: number
  image?: string
  drop_active?: boolean
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="border rounded overflow-hidden">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="h-48 bg-gray-100 flex items-center justify-center">
          {product.image ? <img src={product.image} alt={product.name} className="object-cover h-full w-full" /> : <div className="text-gray-500">No image</div>}
        </div>
      </Link>
      <div className="p-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{product.name}</h3>
          <div className="text-sm text-gray-600">${(product.price_cents / 100).toFixed(2)}</div>
        </div>
        {product.drop_active ? <Badge>Drop</Badge> : null}
      </div>
    </article>
  )
}
