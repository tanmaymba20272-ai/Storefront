import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  children?: React.ReactNode
}

export default function Dialog({ open, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white rounded p-4 z-10 max-w-lg w-full">{children}</div>
    </div>
  )
}
