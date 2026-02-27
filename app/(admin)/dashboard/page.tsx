import React from 'react'
import Sidebar from '../../../components/admin/Sidebar'
import CartDrawer from '../../../components/cart/CartDrawer'

export default function AdminDashboardPage() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="border rounded p-4">Stats card placeholder</div>
          <div className="border rounded p-4">Stats card placeholder</div>
          <div className="border rounded p-4">Stats card placeholder</div>
        </div>
      </main>
      <CartDrawer />
    </div>
  )
}
