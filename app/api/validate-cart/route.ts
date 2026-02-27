import { NextRequest } from 'next/server'
import { validateCart } from '../../../lib/actions/cart'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const items = body.items ?? []
    const customerId = body.customerId
    const result = await validateCart(items, customerId)
    return new Response(JSON.stringify({ success: true, data: result }), { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown'
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500 })
  }
}
