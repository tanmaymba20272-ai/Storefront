import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'px-3 py-2 rounded-md font-medium focus:outline-none focus:ring-2'
  const variants: Record<string, string> = {
    primary: 'bg-black text-white hover:opacity-95',
    ghost: 'bg-transparent text-black',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
