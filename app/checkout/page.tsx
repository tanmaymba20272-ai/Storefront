"use client"

import React from 'react'
import { useCartStore, useHydrated } from '../../store/cartStore'

export default function CheckoutPage() {
  const hydrated = useHydrated()
  const items = useCartStore((s) => s.items)

  if (!hydrated) return null

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>

      <div className="bg-white p-4 rounded shadow">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">Your cart is empty.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.sku} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{(it.metadata?.name as string | undefined) ?? it.sku}</div>
                  <div className="text-sm text-gray-500">Qty: {it.quantity}</div>
                </div>
                <div className="text-sm text-gray-700">—</div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <button disabled className="px-4 py-2 bg-gray-300 text-gray-700 rounded">
            Proceed (demo)
          </button>
        </div>
      </div>
    </div>
  )
}
