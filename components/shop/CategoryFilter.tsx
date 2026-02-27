'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CategoryListItem } from '../../lib/actions/catalog'

interface CategoryFilterProps {
  categories: CategoryListItem[]
}

export default function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('category') ?? ''

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) {
      params.set('category', slug)
    } else {
      params.delete('category')
    }
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <nav
      aria-label="Category filter"
      className="sticky top-16 z-10 flex gap-2 overflow-x-auto bg-cream/80 py-3 backdrop-blur"
    >
      <button
        onClick={() => select('')}
        className={`min-h-[44px] shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
          active === ''
            ? 'border-navy bg-navy text-cream'
            : 'border-stone text-charcoal hover:border-navy hover:text-navy'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => select(cat.slug)}
          className={`min-h-[44px] shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            active === cat.slug
              ? 'border-navy bg-navy text-cream'
              : 'border-stone text-charcoal hover:border-navy hover:text-navy'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </nav>
  )
}
