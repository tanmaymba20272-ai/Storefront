import React from 'react'
import Link from 'next/link'
import { getServerSupabase } from '../../../lib/supabaseClient'
import ClearCartOnSuccess from '../../../components/checkout/ClearCartOnSuccess'

type Props = { searchParams: { order_id?: string } }

const formatINR = (paise: number) => `₹${(paise / 100).toFixed(2)}`

export default async function Page({ searchParams }: Props) {
  const orderId = searchParams?.order_id

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-semibold">Order confirmation</h1>
          <p className="mt-4 text-muted-foreground">No order id provided. If you just completed checkout, please check your email for confirmation or return to shopping.</p>
          <div className="mt-6">
            <Link href="/shop" className="px-4 py-2 bg-black text-white rounded">Continue Shopping</Link>
          </div>
        </div>
      </div>
    )
  }

  const supabase = getServerSupabase()
  const { data: order, error } = await supabase
    .from('orders')
    .select('id,razorpay_order_id,status,amount_paise,currency,items,shipping_address,created_at,paid_at')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-semibold">Order not found</h1>
          <p className="mt-4 text-muted-foreground">We couldn't find your order. Please contact support if you were charged.</p>
          <div className="mt-6">
            <Link href="/shop" className="px-4 py-2 bg-black text-white rounded">Continue Shopping</Link>
          </div>
        </div>
      </div>
    )
  }

  const items: any[] = Array.isArray(order.items) ? order.items : []

  return (
    <div className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl bg-white shadow-md rounded p-8">
        <h1 className="text-3xl font-semibold">Thank you — order received</h1>
        <p className="mt-2 text-sm text-gray-600">Your order is confirmed. A receipt has been sent to your email.</p>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-medium text-gray-700">Order</h2>
            <div className="mt-2 text-lg font-mono">{order.id}</div>
            <div className="mt-1 text-sm text-gray-600">Status: <span className="font-medium">{order.status}</span></div>
            <div className="mt-1 text-sm text-gray-600">Razorpay: {order.razorpay_order_id}</div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-700">Total paid</h2>
            <div className="mt-2 text-2xl font-semibold">{formatINR(order.amount_paise)}</div>
            <div className="mt-1 text-sm text-gray-600">{order.currency || 'INR'}</div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium">Items</h3>
          <ul className="mt-3 divide-y">
            {items.length === 0 && <li className="py-3 text-sm text-gray-600">No items listed</li>}
            {items.map((it, i) => (
              <li key={i} className="py-3 flex justify-between">
                <span className="text-sm">{it?.name ?? 'Item'}</span>
                <span className="text-sm text-gray-600">Qty: {it?.quantity ?? 1}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium">Shipping address</h3>
          <div className="mt-2 text-sm text-gray-700">
            {order.shipping_address ? (
              <address className="not-italic whitespace-pre-line">{typeof order.shipping_address === 'string' ? order.shipping_address : JSON.stringify(order.shipping_address, null, 2)}</address>
            ) : (
              <div className="text-gray-600">No shipping address provided</div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Link href="/shop" className="px-4 py-2 bg-black text-white rounded">Continue Shopping</Link>
          <div className="text-sm text-gray-500">Placed: {new Date(order.created_at).toLocaleString()}</div>
        </div>

        <ClearCartOnSuccess />
      </div>
    </div>
  )
}
