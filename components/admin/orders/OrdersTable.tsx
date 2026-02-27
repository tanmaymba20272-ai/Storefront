"use client"
import React from 'react'
import Link from 'next/link'

type Order = {
  id: string
  user_id: string
  razorpay_order_id: string
  status: string
  amount_paise: number
  currency: string
  created_at: string
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const formatINR = (paise: number) => `₹${(paise / 100).toFixed(2)}`

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="text-left text-sm text-gray-600">
            <th className="py-2 pr-4">Order</th>
            <th className="py-2 pr-4">Customer</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="py-3 text-sm font-mono">{o.id.slice(0, 10)}...</td>
              <td className="py-3 text-sm">{o.user_id}</td>
              <td className="py-3 text-sm">
                <span className="px-2 py-1 text-xs rounded bg-gray-100">{o.status}</span>
              </td>
              <td className="py-3 text-sm">{formatINR(o.amount_paise)}</td>
              <td className="py-3 text-sm">{new Date(o.created_at).toLocaleString()}</td>
              <td className="py-3">
                <Link href={`/admin/orders/${o.id}`} className="text-sm text-blue-600">View</Link>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-sm text-gray-600">No orders</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
