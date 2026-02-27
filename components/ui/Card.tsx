import React from 'react'

type Props = {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: Props) {
  return <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>{children}</div>
}
