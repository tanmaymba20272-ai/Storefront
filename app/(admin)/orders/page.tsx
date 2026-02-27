import React, { Suspense } from 'react'
import { getServerSupabase } from '../../../lib/supabaseClient'
import OrdersTable from '../../../components/admin/orders/OrdersTable'
import OrdersTableSkeleton from '../../../components/admin/orders/OrdersTableSkeleton'

export default async function Page() {
  const supabase = getServerSupabase()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id,user_id,razorpay_order_id,status,amount_paise,currency,created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const ordersData = Array.isArray(orders) ? orders : []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <div className="mt-6">
        <Suspense fallback={<OrdersTableSkeleton />}>
          {/* @ts-ignore Server -> Client prop */}
          <OrdersTable orders={ordersData} />
        </Suspense>
      </div>
    </div>
  )
}
