import { useCartStore } from '../store/cartStore'

test('cart store add/update/remove works (unit)', () => {
  const { addItem, clearCart, items, updateQuantity, removeItem } = useCartStore.getState()
  clearCart()
  addItem({ productId: 'a', name: 'A', price_cents: 500, quantity: 1 })
  expect(useCartStore.getState().items.length).toBe(1)
  updateQuantity('a', 3)
  expect(useCartStore.getState().items[0].quantity).toBe(3)
  removeItem('a')
  expect(useCartStore.getState().items.length).toBe(0)
})
