'use client'

import React from 'react'
import { useCartStore } from '../../store/cartStore'
import type { Variant } from '../../lib/actions/catalog'

interface AddToCartButtonProps {
  productId: string
  name: string
  priceCents: number
  image?: string
  selectedVariant?: Variant | null
}

export default function AddToCartButton({
  productId,
  name,
  priceCents,
  image,
  selectedVariant,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem)

  function handle() {
    addItem({
      productId,
      name,
      price_cents: priceCents,
      quantity: 1,
      sku: selectedVariant?.sku ?? undefined,
      image,
    })
  }

  return (
    <button
      onClick={handle}
      className="w-full rounded-lg bg-navy px-6 py-3 font-sans text-base font-medium text-cream transition-colors hover:bg-forest focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
    >
      Add to Cart
    </button>
  )
}
