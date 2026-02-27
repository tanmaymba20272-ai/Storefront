import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServerSupabase } from '../../../../lib/supabaseClient'
import OrdersList from '../../../../components/account/OrdersList'
import OrdersPageSkeleton from '../../../../components/account/OrdersPageSkeleton'
import type { Database, Order } from '../../../../types/api'

export const dynamic = 'force-dynamic'

async function OrdersContent() {
  // Cookie-aware auth client — reads the user's session reliably from cookies
  const cookieStore = await cookies()
  const authClient = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/')

  // Service-role client fetches data; still scoped to verified user.id
  const supabase = getServerSupabase()
  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, status, amount_paise, currency, created_at, items, fulfillment_status, awb_code, courier_name'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return <OrdersList orders={(orders as unknown as Order[]) ?? []} />
}

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-screen-lg">
        <h1 className="mb-10 font-serif text-3xl text-navy md:text-4xl">Your Orders</h1>
        <Suspense fallback={<OrdersPageSkeleton />}>
          <OrdersContent />
        </Suspense>
      </div>
    </main>
  )
}
