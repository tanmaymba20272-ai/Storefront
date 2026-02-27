"use client"
import React from 'react'

export default function OrderDetailSkeleton() {
  return (
    <div className="p-4 bg-white rounded border animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="space-y-2">
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
