"use client"
import React from 'react'
import Link from 'next/link'

export default function Sidebar() {
  return (
    <aside className="w-64 border-r h-screen p-4">
      <nav className="space-y-2">
        <Link href="/admin/dashboard" className="block font-medium">Dashboard</Link>
        <Link href="/admin/products" className="block">Products</Link>
        <Link href="/admin/orders" className="block">Orders</Link>
        <Link href="/admin/drops" className="block">Drops</Link>
        <Link href="/admin/blog" className="block">Blog</Link>
        <Link href="/admin/settings" className="block">Settings</Link>
      </nav>
    </aside>
  )
}
