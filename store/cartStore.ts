import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type CartItem = {
  productId: string
  sku?: string
  quantity: number
  price_cents: number
  name: string
  image?: string
}

type State = {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  open: () => void
  close: () => void
}

const isClient = typeof window !== 'undefined'

export const useCartStore = create<State>()(
  devtools((set, get) => ({
    items: isClient ? JSON.parse(localStorage.getItem('cart.items') || '[]') : [],
    isOpen: false,
    addItem: (item) =>
      set((state) => {
        const exists = state.items.find((i) => i.productId === item.productId)
        let items
        if (exists) {
          items = state.items.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i))
        } else {
          items = [...state.items, item]
        }
        if (isClient) localStorage.setItem('cart.items', JSON.stringify(items))
        return { items }
      }),
    removeItem: (productId) =>
      set((state) => {
        const items = state.items.filter((i) => i.productId !== productId)
        if (isClient) localStorage.setItem('cart.items', JSON.stringify(items))
        return { items }
      }),
    updateQuantity: (productId, quantity) =>
      set((state) => {
        const items = state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i))
        if (isClient) localStorage.setItem('cart.items', JSON.stringify(items))
        return { items }
      }),
    clearCart: () => {
      if (isClient) localStorage.removeItem('cart.items')
      return { items: [] }
    },
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  }))
)
