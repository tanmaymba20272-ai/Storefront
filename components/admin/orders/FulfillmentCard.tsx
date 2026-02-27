"use client"
import React, { useState } from 'react'

type Order = {
  id: string
  shipping_address?: any
  fulfillment_status?: string
  awb_code?: string | null
  courier_name?: string | null
  label_url?: string | null
}

export default function FulfillmentCard({ order }: { order: Order | null }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string | undefined>(order?.fulfillment_status)
  const [awb, setAwb] = useState<string | undefined | null>(order?.awb_code)
  const [courier, setCourier] = useState<string | undefined | null>(order?.courier_name)
  const [labelUrl, setLabelUrl] = useState<string | undefined | null>(order?.label_url)

  if (!order) return <div className="p-4 bg-white rounded border">Order not found</div>

  const handleFulfill = async () => {
    if (loading) return
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/fulfill`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.status === 400) {
        const err = await res.json().catch(() => ({ message: 'Invalid request' }))
        setMessage(err.message || 'Unable to fulfill order')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setMessage('Server error while fulfilling. Try again later.')
        setLoading(false)
        return
      }

      const data = await res.json().catch(() => null)
      if (data) {
        setAwb(data.awb_code ?? data.awb ?? null)
        setCourier(data.courier_name ?? null)
        setLabelUrl(data.label_url ?? null)
        setFulfillmentStatus(data.fulfillment_status ?? 'fulfilled')
        setMessage('Fulfillment created')
      } else {
        setMessage('Fulfillment created')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error while fulfilling. Please try again.'
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const badgeColor = (status?: string) => {
    switch (status) {
      case 'fulfilled':
        return 'bg-green-100 text-green-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      case 'unfulfilled':
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const address = order.shipping_address || {}

  return (
    <div className="p-4 bg-white rounded border">
      <h2 className="text-lg font-medium">Fulfillment</h2>

      <div className="mt-3">
        <div className="text-sm text-gray-600">Shipping Address</div>
        <div className="mt-2 text-sm text-gray-800">
          {address.name && <div>{address.name}</div>}
          {address.address_line1 && <div>{address.address_line1}</div>}
          {address.city && <div>{address.city}{address.state ? `, ${address.state}` : ''}</div>}
          {address.postal_code && <div>{address.postal_code}</div>}
          {address.country && <div>{address.country}</div>}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-gray-600">Fulfillment Status</div>
        <div className={`inline-block mt-2 px-2 py-1 text-xs rounded ${badgeColor(fulfillmentStatus)}`}>{fulfillmentStatus ?? 'unknown'}</div>
      </div>

      {awb && (
        <div className="mt-4 text-sm">
          <div className="text-gray-600">AWB</div>
          <div className="mt-1 font-mono">{awb}</div>
        </div>
      )}

      {courier && (
        <div className="mt-2 text-sm text-gray-700">Courier: {courier}</div>
      )}

      {labelUrl && (
        <div className="mt-3">
          <a href={labelUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Download Label</a>
        </div>
      )}

      <div className="mt-6">
        {fulfillmentStatus === 'unfulfilled' && (
          <button
            onClick={handleFulfill}
            disabled={loading}
            aria-label="Fulfill order with Shiprocket"
            className={`inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : null}
            Fulfill with Shiprocket
          </button>
        )}
      </div>

      {message && (
        <div role="status" className="mt-4 text-sm text-gray-800">{message}</div>
      )}
    </div>
  )
}
