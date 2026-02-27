import React from 'react'
import { render, screen } from '@testing-library/react'
import ProductCard from '../components/ProductCard'
import ShopGridSkeleton from '../components/shop/ShopGridSkeleton'
import type { ProductListItem } from '../lib/actions/catalog'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_PRODUCT: ProductListItem = {
  id: 'prod-1',
  name: 'The Oxford Shirt',
  slug: 'oxford-shirt',
  price_cents: 489900,
  currency: 'INR',
  metadata: { images: ['https://example.com/shirt.jpg'] },
  category: { id: 'cat-1', name: 'Shirts', slug: 'shirts' },
  drop: null,
}

const MOCK_PRODUCT_WITH_DROP: ProductListItem = {
  ...MOCK_PRODUCT,
  id: 'prod-2',
  slug: 'oxford-shirt-drop',
  drop: {
    id: 'drop-1',
    name: 'Summer Drop',
    start_at: new Date(Date.now() - 3600_000).toISOString(),
    end_at: new Date(Date.now() + 3600_000).toISOString(),
    status: 'active',
  },
}

// ---------------------------------------------------------------------------
// ProductCard
// ---------------------------------------------------------------------------

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(<ProductCard product={MOCK_PRODUCT} />)
    expect(screen.getByText('The Oxford Shirt')).toBeTruthy()
    // Price rendered – just check something is in the DOM
    expect(screen.getByText(/₹/)).toBeTruthy()
  })

  it('links to the correct product slug', () => {
    render(<ProductCard product={MOCK_PRODUCT} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/shop/oxford-shirt')
  })

  it('shows Drop badge when drop is active', () => {
    render(<ProductCard product={MOCK_PRODUCT_WITH_DROP} />)
    expect(screen.getByText('Drop')).toBeTruthy()
  })

  it('does not show Drop badge when drop is null', () => {
    render(<ProductCard product={MOCK_PRODUCT} />)
    expect(screen.queryByText('Drop')).toBeNull()
  })

  // TODO: test image optimisation via next/image wrapper
  // TODO: test hover scale class is applied
})

// ---------------------------------------------------------------------------
// ShopGridSkeleton
// ---------------------------------------------------------------------------

describe('ShopGridSkeleton', () => {
  it('renders 8 skeleton cards', () => {
    const { container } = render(<ShopGridSkeleton />)
    // Each card has 3 skeleton divs; total animate-pulse elements = 8*3 = 24
    const pulseEls = container.querySelectorAll('.animate-pulse')
    expect(pulseEls.length).toBe(24)
  })

  // TODO: snapshot test for stable layout
  // TODO: verify aria-hidden on skeleton elements
})
