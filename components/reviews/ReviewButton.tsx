"use client"

import React, { useState } from 'react'
import ReviewModal from './ReviewModal'

export default function ReviewButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded bg-navy px-3 py-1 text-sm text-white">
        Leave a Review
      </button>
      <ReviewModal productId={productId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
