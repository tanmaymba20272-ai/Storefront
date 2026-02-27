import React from 'react'

export default function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-2 py-1 text-xs rounded ${className} bg-gray-100`}>{children}</span>
}
