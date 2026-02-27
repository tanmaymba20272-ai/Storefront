import React from 'react'

interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-stone/20 ${className}`}
      aria-hidden="true"
    />
  )
}
