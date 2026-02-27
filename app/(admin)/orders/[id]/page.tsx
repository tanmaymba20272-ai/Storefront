import React, { Suspense } from 'react'
import { getServerSupabase } from '../../../../lib/supabaseClient'
import OrdersTable from '../../../../components/admin/orders/OrdersTable'
import FulfillmentCard from '../../../../components/admin/orders/FulfillmentCard'
import OrderDetailSkeleton from '../../../../components/admin/orders/OrderDetailSkeleton'

type Props = {
  params: { id: string }
}

export default async function Page({ params }: Props) {
  const { id } = params
  const supabase = getServerSupabase()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `id,user_id,razorpay_order_id,status,amount_paise,currency,items,shipping_address,created_at,shiprocket_order_id,shipment_id,awb_code,courier_name,label_url,fulfillment_status`
    )
    .eq('id', id)
    .maybeSingle()

  const orderData = order ?? null

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order Detail</h1>
          <p className="text-sm text-gray-600 mt-1">Order ID: {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="mb-6">
            <Suspense fallback={<OrderDetailSkeleton />}>
              {/* @ts-ignore Server -> Client prop */}
              <OrdersTable orders={orderData ? [orderData] : []} />
            </Suspense>
          </div>
        </div>

        <div>
          <Suspense fallback={<OrderDetailSkeleton />}>
            {/* @ts-ignore Server -> Client prop */}
            <FulfillmentCard order={orderData} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
