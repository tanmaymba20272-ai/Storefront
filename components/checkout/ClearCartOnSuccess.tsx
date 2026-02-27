"use client"
import { useEffect } from 'react'
import { useCartStore } from 'store/cartStore'

export default function ClearCartOnSuccess() {
  const clear = useCartStore((s: any) => s.clear)

  useEffect(() => {
    try {
      if (typeof clear === 'function') clear()
    } catch (e) {
      // swallow errors — clearing cart is best-effort
    }
  }, [clear])

  return null
}
