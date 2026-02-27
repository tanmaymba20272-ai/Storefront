"use client"
import React from 'react'
import { useCartStore } from '../../store/cartStore'

export default function AddToCartButton({ product }: { product: any }) {
  const addItem = useCartStore((s) => s.addItem)

  const handle = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price_cents: product.price_cents,
      quantity: 1,
      image: product.image || undefined,
    })
  }

  return (
    <button onClick={handle} className="px-4 py-2 bg-black text-white rounded">
      Add to cart
    </button>
  )
}
