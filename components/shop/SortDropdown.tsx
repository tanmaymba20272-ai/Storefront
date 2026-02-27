'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type SortOption = 'newest' | 'price_asc' | 'price_desc'

const SORT_LABELS: Record<SortOption, string> = {
  newest:     'Newest',
  price_asc:  'Price: Low → High',
  price_desc: 'Price: High → Low',
}

export default function SortDropdown() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = (searchParams.get('sort') as SortOption | null) ?? 'newest'

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', e.target.value)
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm text-charcoal">
      <span className="font-medium text-stone">Sort</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded border border-stone bg-ivory px-3 py-1.5 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-navy"
      >
        {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
          <option key={opt} value={opt}>
            {SORT_LABELS[opt]}
          </option>
        ))}
      </select>
    </label>
  )
}
