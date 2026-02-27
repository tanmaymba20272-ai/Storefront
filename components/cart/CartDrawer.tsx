"use client"
import React from 'react'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'

export default function CartDrawer() {
  const { isOpen, close, items, removeItem, updateQuantity } = useCartStore()

  const subtotal = items.reduce((s, it) => s + it.quantity * it.price_cents, 0)

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'tween' }}
      className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50"
    >
      <div className="p-4 flex items-center justify-between border-b">
        <h3 className="font-medium">Your Cart</h3>
        <button onClick={() => close()} aria-label="Close">Close</button>
      </div>
      <div className="p-4 overflow-auto flex-1">
        {items.length === 0 ? <div className="text-sm text-gray-500">Cart is empty</div> : null}
        <ul className="space-y-4">
          {items.map((it) => (
            <li key={it.productId} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">${(it.price_cents / 100).toFixed(2)} x {it.quantity}</div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-sm font-medium">${((it.price_cents * it.quantity) / 100).toFixed(2)}</div>
                <div className="flex items-center space-x-2 mt-2">
                  <button onClick={() => updateQuantity(it.productId, Math.max(1, it.quantity - 1))}>-</button>
                  <div>{it.quantity}</div>
                  <button onClick={() => updateQuantity(it.productId, it.quantity + 1)}>+</button>
                  <button onClick={() => removeItem(it.productId)} className="text-xs text-red-500">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Subtotal</div>
          <div className="font-medium">${(subtotal / 100).toFixed(2)}</div>
        </div>
        <button className="mt-4 w-full bg-black text-white py-2 rounded">Checkout (demo)</button>
      </div>
    </motion.aside>
  )
}
