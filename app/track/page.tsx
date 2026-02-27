import type { Metadata } from 'next'
import OrderTracker from '../../components/track/OrderTracker'

export const metadata: Metadata = {
  title: 'Track Your Order — Old Money',
}

export default function TrackPage() {
  return <OrderTracker />
}
