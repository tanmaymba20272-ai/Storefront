declare module 'razorpay' {
  interface RazorpayOrderCreateRequestBody {
    amount: number
    currency: string
    receipt?: string
    notes?: Record<string, string>
    partial_payment?: boolean
  }

  interface RazorpayOrder {
    id: string
    entity: string
    amount: number
    amount_paid: number
    amount_due: number
    currency: string
    receipt: string | null
    status: 'created' | 'attempted' | 'paid'
    attempts: number
    notes: Record<string, string>
    created_at: number
  }

  interface RazorpayOptions {
    key_id: string
    key_secret: string
  }

  class Razorpay {
    constructor(options: RazorpayOptions)
    orders: {
      create(body: RazorpayOrderCreateRequestBody): Promise<RazorpayOrder>
    }
    webhooks: {
      validateWebhookSignature(body: string, signature: string, secret: string): boolean
    }
  }

  export = Razorpay
}
