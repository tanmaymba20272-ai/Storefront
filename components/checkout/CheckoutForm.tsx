"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShippingSchema, ShippingFormData } from '../../lib/validations/checkout'
import type { CartItem } from '../../types/cart'
import useCart from '../../store/cartStore'
import { useRouter } from 'next/navigation'

export default function CheckoutForm() {
  const router = useRouter()
  const cartStore = useCart()
  const cartItems: CartItem[] = (cartStore?.items as CartItem[] | undefined) ?? []
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingFormData>({ resolver: zodResolver(ShippingSchema) })

  const subtotal = cartItems.reduce((s, it) => s + (Number((it as any).price ?? 0) * Number((it as any).quantity ?? 1)), 0)
  const shipping = 0
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + gst + shipping

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve()
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load script'))
      document.body.appendChild(s)
    })

  async function onSubmit(data: ShippingFormData) {
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_items: cartItems, shipping_address: data }),
        credentials: 'include',
      })

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}))
        if (body?.code === 'INVENTORY_EXHAUSTED') {
          setMessage('Some items are out of stock — cart updated.')
          const adjusted = body.adjusted_items
          try {
            if (adjusted && Array.isArray(adjusted)) {
              if (typeof (cartStore as any).replaceItems === 'function') {
                ;(cartStore as any).replaceItems(adjusted)
              } else if (typeof (cartStore as any).setItems === 'function') {
                ;(cartStore as any).setItems(adjusted)
              }
            }
          } catch (e: unknown) {
            // best-effort
          }
        } else {
          setMessage('Inventory conflict occurred.')
        }
        setLoading(false)
        return
      }

      if (!res.ok) {
        const err = await res.text().catch(() => 'Unknown error')
        setMessage(`Checkout failed: ${err}`)
        setLoading(false)
        return
      }

      const payload = await res.json()
      const { razorpay_order_id, razorpay_key_id, amount_paise, currency } = payload
      if (!razorpay_order_id || !razorpay_key_id) {
        setMessage('Invalid payment initialization response')
        setLoading(false)
        return
      }

      await loadScript('https://checkout.razorpay.com/v1/checkout.js')
      const RazorpayCtor = (window as any).Razorpay as any
      if (!RazorpayCtor) {
        setMessage('Razorpay SDK failed to load')
        setLoading(false)
        return
      }

      const options: any = {
        key: razorpay_key_id,
        amount: amount_paise,
        currency,
        order_id: razorpay_order_id,
        handler: (response: any) => {
          setModalOpen(false)
          router.push('/checkout/processing')
        },
        prefill: { name: data.fullName, contact: data.phone },
        modal: { ondismiss: () => { setMessage('Payment was dismissed.'); setModalOpen(false); } },
      }

      const r = new RazorpayCtor(options)
      setModalOpen(true)
      r.open()
      setLoading(false)
    } catch (err: unknown) {
      setLoading(false)
      setMessage(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} aria-live="polite">
        <fieldset disabled={loading} style={{ border: 'none', padding: 0 }}>
          <div>
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" {...register('fullName')} />
            {errors.fullName && <div role="alert">{errors.fullName.message}</div>}
          </div>

          <div>
            <label htmlFor="line1">Address line 1</label>
            <input id="line1" {...register('line1')} />
            {errors.line1 && <div role="alert">{errors.line1.message}</div>}
          </div>

          <div>
            <label htmlFor="city">City</label>
            <input id="city" {...register('city')} />
            {errors.city && <div role="alert">{errors.city.message}</div>}
          </div>

          <div>
            <label htmlFor="state">State</label>
            <input id="state" {...register('state')} />
            {errors.state && <div role="alert">{errors.state.message}</div>}
          </div>

          <div>
            <label htmlFor="pincode">Pincode</label>
            <input id="pincode" {...register('pincode')} />
            {errors.pincode && <div role="alert">{errors.pincode.message}</div>}
          </div>

          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" {...register('phone')} />
            {errors.phone && <div role="alert">{errors.phone.message}</div>}
          </div>

          <div>
            <label htmlFor="country">Country</label>
            <input id="country" defaultValue="IN" {...register('country')} />
          </div>

          <hr />

          <section aria-label="Order summary">
            <h2>Order summary</h2>
            <ul>
              {cartItems.map((it: any, idx: number) => (
                <li key={it.id ?? idx}>
                  <span>{(it.name ?? it.sku) + ' x ' + (it.quantity ?? 1)}</span>
                  <span style={{ marginLeft: 8 }}>{(it.price ?? 0)}</span>
                </li>
              ))}
            </ul>
            <div>Subtotal: {subtotal}</div>
            <div>Shipping: {shipping}</div>
            <div>GST (18%): {gst}</div>
            <div><strong>Total: {total}</strong></div>
          </section>

          {message && <div role="status">{message}</div>}

          <button type="submit" disabled={loading} aria-live="polite">
            {loading ? 'Processing…' : 'Pay Now'}
          </button>
        </fieldset>
      </form>

      {modalOpen && (
        <div aria-hidden={!modalOpen} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', padding: 16 }}>
            Opening payment modal…
          </div>
        </div>
      )}
    </div>
  )
}
