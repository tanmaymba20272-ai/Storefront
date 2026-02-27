"use client"

import React from 'react'

export default function CheckoutSkeleton() {
  return (
    <div>
      <h2>Loading checkout…</h2>
      <div style={{ background: '#eee', height: 200, borderRadius: 8 }} />
    </div>
  )
}
