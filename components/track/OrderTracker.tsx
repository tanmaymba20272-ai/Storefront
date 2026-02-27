'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  email: z.string().email('Please enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

interface TrackingResult {
  text: string
  hasTracking: boolean
}

function parseResponse(text: string): TrackingResult {
  const lower = text.toLowerCase()
  const hasTracking =
    lower.includes('awb') ||
    lower.includes('tracking') ||
    lower.includes('shipped') ||
    lower.includes('out for delivery') ||
    lower.includes('delivered') ||
    lower.includes('courier')
  return { text, hasTracking }
}

export default function OrderTracker() {
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setResult(null)
    setServerError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'track order',
          order_id: values.orderId,
          email: values.email,
          intent: 'support',
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}))
        const msg =
          body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
            ? (body as { error: string }).error
            : `Request failed with status ${res.status}`
        throw new Error(msg)
      }

      const data: unknown = await res.json()
      const responseText =
        data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
          ? (data as { message: string }).message
          : data && typeof data === 'object' && 'reply' in data && typeof (data as { reply: unknown }).reply === 'string'
            ? (data as { reply: string }).reply
            : JSON.stringify(data)

      setResult(parseResponse(responseText))
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-20">
      <div className="w-full max-w-lg border border-navy/10 bg-ivory px-8 py-10 shadow-sm">
        <h1 className="mb-2 font-serif text-3xl text-navy">Track Your Order</h1>
        <p className="mb-8 font-sans text-sm text-stone">
          Enter your order ID and email to get the latest status.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          {/* Order ID */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="orderId" className="font-sans text-xs font-semibold uppercase tracking-widest text-charcoal">
              Order ID
            </label>
            <input
              id="orderId"
              type="text"
              autoComplete="off"
              placeholder="e.g. 3f4a1b2c-..."
              aria-describedby={errors.orderId ? 'orderId-error' : undefined}
              className={`border bg-cream px-4 py-3 font-mono text-sm text-charcoal placeholder-stone/60 outline-none transition-colors focus:border-navy ${errors.orderId ? 'border-red-400' : 'border-navy/20'}`}
              {...register('orderId')}
            />
            {errors.orderId && (
              <p id="orderId-error" className="font-sans text-xs text-red-600">{errors.orderId.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-sans text-xs font-semibold uppercase tracking-widest text-charcoal">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`border bg-cream px-4 py-3 font-sans text-sm text-charcoal placeholder-stone/60 outline-none transition-colors focus:border-navy ${errors.email ? 'border-red-400' : 'border-navy/20'}`}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="font-sans text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            aria-disabled={loading}
            className="mt-2 border border-navy bg-navy px-8 py-4 font-sans text-sm font-semibold uppercase tracking-widest text-ivory transition-colors duration-200 hover:bg-transparent hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Tracking…' : 'Track Order'}
          </button>
        </form>

        {/* Server error */}
        {serverError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-6 border border-red-200 bg-red-50 px-5 py-4"
          >
            <p className="font-sans text-sm text-red-700">{serverError}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Tracking result"
            className={`mt-6 border px-5 py-5 ${result.hasTracking ? 'border-forest/30 bg-forest/5' : 'border-navy/10 bg-cream'}`}
          >
            {result.hasTracking && (
              <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-widest text-forest">
                Tracking Information Found
              </p>
            )}
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-charcoal">
              {result.text}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
