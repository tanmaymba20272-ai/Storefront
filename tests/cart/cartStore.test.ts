// Simple unit tests for cart persistence/hydration behaviour.
// Note: test runner may not be configured in this repo. These are example tests.
// TODO: ensure @types/jest (or @jest/globals) is installed and added to tsconfig compilerOptions.types.

// TODO: `act` from 'react-dom/test-utils' is deprecated in React 18.
// Switch to: import { act } from 'react' once React 18 typings are confirmed in this project.
import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { useCartStore, useHydrated } from '../../store/cartStore'

describe('cart store', () => {
  it('hydrates and persists items', () => {
    // This test assumes a DOM-like environment and localStorage available.
    localStorage.clear()
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({ sku: 'SKU1', quantity: 2 })
    })

    const raw = localStorage.getItem('storefront.cart')
    expect(raw).toBeTruthy()
  })

  it('useHydrated returns true after mount', () => {
    const { result } = renderHook(() => useHydrated())
    // RTL flushes effects synchronously inside act(), so hydrated is true post-render
    expect(result.current).toBe(true)
  })
})
