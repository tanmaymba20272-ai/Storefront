'use client'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full border-t">
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-slate-600">
        <div>© {new Date().getFullYear()} Storefront</div>
        <div className="flex gap-4">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  )
}
