import React from 'react'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-stone/20 ${className}`}
      aria-hidden="true"
    />
  )
}

export default Skeleton
export type { SkeletonProps }
