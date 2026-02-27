'use client'

import React, { useState } from 'react'
import VariantSelector from './VariantSelector'
import AddToCartButton from './AddToCartButton'
import type { Variant } from '../../lib/actions/catalog'

interface VariantAndCartProps {
  variants: Variant[]
  productId: string
  productName: string
  priceCents: number
  image: string | null
}

/**
 * Client island that co-locates VariantSelector + AddToCartButton so they
 * can share the selected-variant state without prop-drilling through server
 * component boundaries.
 */
export default function VariantAndCart({
  variants,
  productId,
  productName,
  priceCents,
  image,
}: VariantAndCartProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <VariantSelector variants={variants} onSelect={setSelectedVariant} />
      <AddToCartButton
        productId={productId}
        name={productName}
        priceCents={priceCents}
        image={image ?? undefined}
        selectedVariant={selectedVariant}
      />
    </div>
  )
}
