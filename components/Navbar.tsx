'use client'
import Link from 'next/link'
import { useState } from 'react'
import LoginModal from './auth/LoginModal'
import RegisterModal from './auth/RegisterModal'

export default function Navbar() {
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-semibold">Storefront</Link>
          <nav className="hidden md:flex gap-3 text-sm text-slate-600">
            <Link href="/">Shop</Link>
            <Link href="/blog">Blog</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-slate-600">Admin</Link>
          <button
            onClick={() => setShowLogin(true)}
            className="text-sm px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200"
          >
            Login
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="text-sm px-3 py-1 rounded-md bg-black text-white hover:opacity-90"
          >
            Sign up
          </button>
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </header>
  )
}
