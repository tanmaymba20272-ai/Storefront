/**
 * Minimal test stub for products rendering.
 * TODO: Expand with proper Jest/React Testing Library setup.
 */
import React from 'react'
import ProductCard from '../components/ProductCard'

test('ProductCard renders basic info', () => {
  const product = { id: '1', name: 'Test', slug: 'test', price_cents: 1000, image: undefined }
  // Basic smoke render (no DOM assertions here; placeholder until test harness exists)
  expect(() => ProductCard({ product })).not.toThrow()
})
