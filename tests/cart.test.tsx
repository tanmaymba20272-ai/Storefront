import { useCartStore } from '../store/cartStore'

test('cart store add/update/remove works (unit)', () => {
  const { addItem, clear, setQuantity, removeItem } = useCartStore.getState()
  clear()
  addItem({ sku: 'a', quantity: 1 })
  expect(useCartStore.getState().items.length).toBe(1)
  setQuantity('a', 3)
  expect(useCartStore.getState().items[0].quantity).toBe(3)
  removeItem('a')
  expect(useCartStore.getState().items.length).toBe(0)
})
