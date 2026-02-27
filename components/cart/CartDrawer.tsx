"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, useHydrated } from '../../store/cartStore'
import type { CartItem, ValidateCartError } from '../../types/cart'

export default function CartDrawer() {
  const hydrated = useHydrated()
  const items = useCartStore((s) => s.items)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const isOpen = useCartStore((s) => s.isOpen)
  const close = useCartStore((s) => s.close)

  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const drawerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      const prev = document.activeElement as HTMLElement | null
      drawerRef.current?.focus()
      return () => prev?.focus()
    }
    return
  }, [isOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  if (!hydrated) return null

  async function handleProceed() {
    setLoading(true)
    setErrors([])
    try {
      const res = await fetch('/api/validate-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      // API route expected shape: { success: boolean, data: { valid, errors, adjusted_items } }
      const data = json?.data ?? json
      if (res.ok && data?.valid) {
        close()
        router.push('/checkout')
        return
      }

      // invalid: apply adjustments and show errors
      // NOTE: the DB RPC uses `adjusted_quantity`, not `quantity`.
      const adjusted: Array<{ sku: string; adjusted_quantity: number }> = data?.adjusted_items || []
      adjusted.forEach((ai) => {
        if (!ai.sku) return
        if (ai.adjusted_quantity <= 0) removeItem(ai.sku)
        else setQuantity(ai.sku, ai.adjusted_quantity)
      })
      const errs = (data?.errors || []).map((e: ValidateCartError) => {
        if (!e.sku) return e.error ?? e.message ?? 'Unknown error'
        const detail =
          e.message ??
          e.error ??
          (e.requested != null ? `requested ${e.requested}, available ${e.available ?? 0}` : 'unavailable')
        return `${e.sku}: ${detail}`
      })
      setErrors(errs)
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : 'Unexpected error'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={drawerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Cart drawer"
      aria-hidden={!isOpen}
      className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-lg transform transition-transform z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="text-lg font-medium">Your cart</h2>
        <div>
          <button onClick={() => close()} aria-label="Close cart" className="px-2 py-1">
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {errors.length > 0 && (
          <div role="alert" className="mb-3 bg-red-50 border border-red-200 p-2">
            {errors.map((e, i) => (
              <div key={i} className="text-sm text-red-700">
                {e}
              </div>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-sm text-gray-500">Your cart is empty.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((it: CartItem) => (
              <li key={it.sku} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{(it.metadata?.name as string | undefined) ?? it.sku}</div>
                  <div className="text-sm text-gray-500">Qty: {it.quantity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(it.sku, Math.max(0, it.quantity - 1))}
                    aria-label={`Decrease quantity for ${it.sku}`}
                    className="px-2 py-1 border"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setQuantity(it.sku, it.quantity + 1)}
                    aria-label={`Increase quantity for ${it.sku}`}
                    className="px-2 py-1 border"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(it.sku)}
                    aria-label={`Remove ${(it.metadata?.name as string | undefined) ?? it.sku} from cart`}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Subtotal</div>
          <div className="font-medium">—</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => clear()}
            className="px-4 py-2 border rounded text-sm"
            disabled={loading}
          >
            Clear
          </button>
          <button
            onClick={handleProceed}
            className="ml-auto px-4 py-2 bg-black text-white rounded disabled:opacity-50"
            disabled={loading || items.length === 0}
            aria-disabled={loading || items.length === 0}
            aria-busy={loading}
          >
            {loading ? 'Validating…' : 'Proceed to checkout'}
          </button>
        </div>
      </div>
    </div>
  )
}
