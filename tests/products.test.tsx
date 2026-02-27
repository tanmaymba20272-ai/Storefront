/**
 * Minimal test stub for products rendering.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import ProductCard from '../components/ProductCard'

const MOCK_PRODUCT = {
  id: '1',
  name: 'Test Shirt',
  slug: 'test-shirt',
  price_cents: 1000,
  currency: 'INR',
  metadata: { images: [] },
  category: { id: 'c1', name: 'Tops', slug: 'tops' },
  drop: null,
}

test('ProductCard renders basic info', () => {
  render(<ProductCard product={MOCK_PRODUCT as any} />)
  expect(screen.getByText('Test Shirt')).toBeTruthy()
})
