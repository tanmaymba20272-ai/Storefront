import { useCartStore } from '../../store/cartStore'

describe('cart wiring', () => {
  afterEach(() => {
    // reset to default
    useCartStore.setState({ items: [], isOpen: false })
  })

  it('toggle/open/close mutate isOpen', () => {
    const before = useCartStore.getState().isOpen
    useCartStore.getState().open()
    expect(useCartStore.getState().isOpen).toBe(true)
    useCartStore.getState().toggle()
    expect(useCartStore.getState().isOpen).toBe(false)
    useCartStore.getState().close()
    expect(useCartStore.getState().isOpen).toBe(false)
    // restore
    useCartStore.setState({ isOpen: before })
  })
})
