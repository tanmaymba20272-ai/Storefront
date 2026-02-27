import React, { Suspense } from 'react'
import CheckoutForm from '../../components/checkout/CheckoutForm'
import CheckoutSkeleton from '../../components/checkout/CheckoutSkeleton'

export default function CheckoutPage() {
  return (
    <main>
      <h1>Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutForm />
      </Suspense>
    </main>
  )
}
