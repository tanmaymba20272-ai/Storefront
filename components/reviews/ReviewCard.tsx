"use client"

import React from 'react'
import Lightbox from './Lightbox'

type Review = {
  id: string
  reviewer_name?: string | null
  anonymized?: boolean | null
  rating: number
  body?: string | null
  helpful_count?: number | null
  media_urls?: string[] | null
}

/**
 * Converts a raw Supabase storage key (e.g. "review-media/uuid/file.jpg")
 * to a fully-qualified public URL.
 * `review-media` is a public bucket so this is safe client-side.
 * TODO: If the bucket ever becomes private, move URL signing server-side and
 *       pass pre-signed URLs as props instead.
 */
function toPublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return key
  // Guard against double-encoding: if the key is already a full URL, return it.
  if (key.startsWith('http://') || key.startsWith('https://')) return key
  // Strip leading "review-media/" prefix if present so we don't double-nest it.
  const cleanKey = key.startsWith('review-media/') ? key.slice('review-media/'.length) : key
  return `${base}/storage/v1/object/public/review-media/${cleanKey}`
}

export default function ReviewCard({ review }: { review: Review }) {
  const name = review.anonymized ? 'Anonymous' : review.reviewer_name ?? 'Anonymous'

  return (
    <div className="rounded border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-stone-200" aria-hidden />
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-sm text-stone-500">{review.rating} / 5</div>
          </div>
        </div>
        <div className="text-sm text-stone-500">{review.helpful_count ?? 0} helpful</div>
      </div>

      {review.body && <p className="mt-3 text-sm text-stone-700">{review.body}</p>}

      {review.media_urls && review.media_urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {review.media_urls.map((m) => (
            <Lightbox key={m} src={toPublicUrl(m)} thumbsOnly />
          ))}
        </div>
      )}
    </div>
  )
}
