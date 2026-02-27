import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { CartItem } from '../types/cart'

// Re-export so existing imports from this module continue to work.
export type { CartItem } from '../types/cart'

type CartState = {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (sku: string) => void
  setQuantity: (sku: string, quantity: number) => void
  clear: () => void
  open: () => void
  close: () => void
  toggle: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item: CartItem) =>
        set((state) => {
          const exists = state.items.find((i) => i.sku === item.sku)
          let items
          if (exists) {
            items = state.items.map((i) => (i.sku === item.sku ? { ...i, quantity: i.quantity + item.quantity } : i))
          } else {
            items = [...state.items, item]
          }
          return { items }
        }),
      removeItem: (sku: string) =>
        set((state) => ({ items: state.items.filter((i) => i.sku !== sku) })),
      setQuantity: (sku: string, quantity: number) =>
        set((state) => ({ items: state.items.map((i) => (i.sku === sku ? { ...i, quantity } : i)) })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    { name: 'storefront.cart' }
  )
)

// Hydration guard hook to avoid server/client mismatch
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}
