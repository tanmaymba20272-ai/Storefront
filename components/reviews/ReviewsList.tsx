"use client"

import React from 'react'
import ReviewCard from './ReviewCard'

type Review = {
  id: string
  reviewer_name?: string | null
  anonymized?: boolean | null
  rating: number
  body?: string | null
  helpful_count?: number | null
  media_urls?: string[] | null
}

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) return <div className="p-4 text-sm text-stone-500">No reviews yet</div>

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  )
}
