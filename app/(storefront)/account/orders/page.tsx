import React from 'react'
import { getServerSupabase } from '../../../../lib/supabaseClient'
import ReviewButton from '../../../../components/reviews/ReviewButton'

export default async function OrdersPage() {
  const supabase = getServerSupabase()
  // Attempt to get auth user server-side
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Orders</h2>
        <p className="mt-2 text-sm text-stone-600">Please sign in to view your orders.</p>
      </div>
    )
  }

  // Fetch recent orders for the user. Items assumed shape: { product_id, title }
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id,status,delivery_date,items')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('orders fetch error', error)
    return <div className="p-6 text-sm text-red-600">Unable to load orders</div>
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Orders</h2>
      <div className="mt-4 flex flex-col gap-4">
        {(orders ?? []).map((o: any) => (
          <div key={o.id} className="rounded border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Order {o.id}</div>
                <div className="text-sm text-stone-500">Status: {o.status}</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {(o.items ?? []).map((it: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>{it.title ?? it.product_id}</div>
                  {/* Show Leave a Review only for delivered/paid with delivery_date present */}
                  {(o.status === 'delivered' || o.status === 'paid') && o.delivery_date ? (
                    <ReviewButton productId={it.product_id} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
