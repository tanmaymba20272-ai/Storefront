import { NextResponse } from 'next/server'
import { submitReview } from '../../../../lib/actions/reviews'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { product_id, rating, body: text, media_urls } = body
    const result = await submitReview({ product_id, rating, body: text, media_urls })
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'unknown' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, review_id: result.review_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
