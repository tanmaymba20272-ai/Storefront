'use client'

import React, { useState } from 'react'
import type { Variant } from '../../lib/actions/catalog'

export interface VariantOption {
  type: 'size' | 'color'
  label: string
  value: string
  available: boolean
}

interface VariantSelectorProps {
  variants: Variant[]
  onSelect: (variant: Variant | null) => void
}

/**
 * Extracts VariantOption groups from the Variant list.
 * Variants may expose size/colour info via metadata.options or via title.
 */
function parseOptions(variants: Variant[]): VariantOption[] {
  const seen = new Set<string>()
  const options: VariantOption[] = []

  for (const v of variants) {
    // Prefer metadata.options array when present
    const rawOptions = (v.metadata?.options ?? []) as Partial<VariantOption>[]
    if (rawOptions.length > 0) {
      for (const o of rawOptions) {
        const key = `${o.type ?? 'size'}-${o.value ?? v.sku}`
        if (!seen.has(key)) {
          seen.add(key)
          options.push({
            type: (o.type as 'size' | 'color') ?? 'size',
            label: o.label ?? v.title ?? v.sku,
            value: o.value ?? v.sku,
            available: o.available ?? true,
          })
        }
      }
    } else {
      // Fallback: treat each variant as a size option
      const key = `size-${v.sku}`
      if (!seen.has(key)) {
        seen.add(key)
        options.push({
          type: 'size',
          label: v.title ?? v.sku,
          value: v.sku,
          available: true,
        })
      }
    }
  }

  return options
}

export default function VariantSelector({ variants, onSelect }: VariantSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const options = parseOptions(variants)

  // Group by type
  const groups = options.reduce<Record<string, VariantOption[]>>((acc, o) => {
    if (!acc[o.type]) acc[o.type] = []
    acc[o.type].push(o)
    return acc
  }, {})

  function handleSelect(opt: VariantOption) {
    if (!opt.available) return
    if (selectedValue === opt.value) {
      setSelectedValue(null)
      onSelect(null)
    } else {
      setSelectedValue(opt.value)
      // Find the matching variant
      const match = variants.find((v) => v.sku === opt.value) ?? null
      onSelect(match)
    }
  }

  if (options.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groups).map(([type, opts]) => (
        <div key={type}>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone">
            {type}
          </p>
          <div className="flex flex-wrap gap-2">
            {opts.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt)}
                disabled={!opt.available}
                aria-pressed={selectedValue === opt.value}
                className={`min-h-[44px] min-w-[44px] rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedValue === opt.value
                    ? 'border-navy bg-navy text-cream'
                    : opt.available
                    ? 'border-stone text-charcoal hover:border-navy hover:text-navy'
                    : 'cursor-not-allowed border-stone/40 text-stone opacity-40 line-through'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
