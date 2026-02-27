"use client"
import React from 'react'

export default function OrdersTableSkeleton() {
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
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-t animate-pulse">
              <td className="py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
              <td className="py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
              <td className="py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
              <td className="py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
              <td className="py-4"><div className="h-4 bg-gray-200 rounded w-36" /></td>
              <td className="py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
