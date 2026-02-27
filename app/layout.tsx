import './globals.css'
import type { ReactNode } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export const metadata = {
  title: 'Storefront',
  description: 'Minimal Storefront frontend',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-slate-900">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
