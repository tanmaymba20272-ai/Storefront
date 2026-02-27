'use client'

import { useState } from 'react'
import type { Order, OrderStatus } from '../../types/api'
import ReviewModal from '../reviews/ReviewModal'

interface OrderItem {
  product_id: string
  product_name?: string
  sku?: string
  quantity: number
  price_cents: number
}

function parseItems(raw: Record<string, unknown>[] | null): OrderItem[] {
  if (!raw) return []
  return raw.map((r) => ({
    product_id: String(r.product_id ?? ''),
    product_name: r.product_name != null ? String(r.product_name) : undefined,
    sku: r.sku != null ? String(r.sku) : undefined,
    quantity: Number(r.quantity ?? 1),
    price_cents: Number(r.price_cents ?? 0),
  }))
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
  abandoned: 'bg-gray-100 text-gray-600',
  delivered: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 font-sans text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  )
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100)
}

interface ReviewTarget {
  productId: string
  productName: string
}

interface OrderRowProps {
  order: Order
  onReview: (target: ReviewTarget) => void
}

function OrderRow({ order, onReview }: OrderRowProps) {
  const [expanded, setExpanded] = useState(false)
  const items = parseItems(order.items ?? null)
  const canReview = order.status === 'paid' || order.status === 'delivered'

  return (
    <div className="border border-navy/10 bg-ivory">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm text-charcoal">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="font-sans text-xs text-stone">
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-sans text-sm font-semibold text-navy">
            {formatINR(order.amount_paise)}
          </span>
          <StatusBadge status={order.status} />
          {order.fulfillment_status && order.fulfillment_status !== 'unfulfilled' && (
            <span className="inline-block rounded-full bg-forest/10 px-3 py-0.5 font-sans text-xs text-forest capitalize">
              {order.fulfillment_status.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="font-sans text-xs font-semibold uppercase tracking-widest text-navy underline-offset-2 hover:underline"
          >
            {expanded ? 'Hide Items' : `View ${items.length} Item${items.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* AWB / Courier */}
      {order.awb_code && (
        <div className="border-t border-navy/5 px-6 py-3">
          <p className="font-sans text-xs text-stone">
            <span className="font-semibold text-charcoal">Tracking:</span>{' '}
            <span className="font-mono">{order.awb_code}</span>
            {order.courier_name && (
              <span className="ml-2 text-stone">via {order.courier_name}</span>
            )}
          </p>
        </div>
      )}

      {/* Items */}
      {expanded && items.length > 0 && (
        <div className="border-t border-navy/5 px-6 py-4">
          <ul className="flex flex-col gap-3">
            {items.map((item, idx) => (
              <li key={`${item.product_id}-${idx}`} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-sans text-sm text-charcoal">
                    {item.product_name ?? 'Product'}
                    {item.sku && (
                      <span className="ml-2 font-mono text-xs text-stone">({item.sku})</span>
                    )}
                  </p>
                  <p className="font-sans text-xs text-stone">Qty: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-sans text-sm text-navy">
                    {formatINR(item.price_cents * item.quantity)}
                  </span>
                  {canReview && item.product_id && (
                    <button
                      onClick={() =>
                        onReview({
                          productId: item.product_id,
                          productName: item.product_name ?? 'Product',
                        })
                      }
                      aria-label={`Leave a review for ${item.product_name ?? 'this product'}`}
                      className="rounded-none border border-gold px-3 py-1 font-sans text-xs font-semibold uppercase tracking-widest text-gold transition-colors duration-200 hover:bg-gold hover:text-navy"
                    >
                      Leave a Review
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface OrdersListProps {
  orders: Order[]
}

export default function OrdersList({ orders }: OrdersListProps) {
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)

  if (orders.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-sans text-stone">You haven't placed any orders yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} onReview={setReviewTarget} />
        ))}
      </div>

      {reviewTarget && (
        <ReviewModal
          productId={reviewTarget.productId}
          open={true}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </>
  )
}
