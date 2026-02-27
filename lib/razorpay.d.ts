export {}

declare global {
  interface RazorpayOptions {
    key: string
    amount?: number
    currency?: string
    order_id?: string
    handler?: (response: any) => void
    prefill?: { name?: string; contact?: string; email?: string }
    modal?: { ondismiss?: () => void }
    [key: string]: any
  }

  interface RazorpayStatic {
    new (options: RazorpayOptions): { open: () => void }
  }

  interface Window {
    Razorpay?: RazorpayStatic
  }
}
