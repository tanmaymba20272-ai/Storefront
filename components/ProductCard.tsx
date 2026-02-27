import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Badge from './ui/Badge'
import type { ProductListItem } from '../lib/actions/catalog'

interface ProductCardProps {
  product: ProductListItem
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export default function ProductCard({ product }: ProductCardProps) {
  const image = product.metadata.images[0] ?? null
  const isActiveDrop = product.drop !== null && product.drop.status === 'active'

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-stone/20 bg-ivory transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-cream">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone text-sm">
            No image
          </div>
        )}
        {isActiveDrop && (
          <span className="absolute left-2 top-2">
            <Badge className="bg-gold/90 text-navy font-semibold">Drop</Badge>
          </span>
        )}
      </Link>

      <div className="flex flex-col gap-1 p-3">
        <h3 className="font-serif text-sm text-navy leading-snug line-clamp-2">
          {product.name}
        </h3>
        <p className="font-sans text-sm font-medium text-gold">
          {formatPrice(product.price_cents, product.currency)}
        </p>
      </div>
    </article>
  )
}
