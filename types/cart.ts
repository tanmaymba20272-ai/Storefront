export type CartItem = {
  productId?: string
  name?: string
  price_cents?: number
  sku?: string
  quantity: number
  image?: string | null
  metadata?: Record<string, unknown>
}

/** Shape returned by the `public.validate_cart` Postgres RPC. */
export type ValidateCartError = {
  sku: string | null
  /** Human-readable message (optional – present on client-generated errors). */
  message?: string
  /** Postgres RPC error code, e.g. 'not_found' | 'missing_sku'. */
  error?: string
  /** Requested quantity (present on shortfall errors). */
  requested?: number
  /** Available quantity (present on shortfall errors). */
  available?: number
}

export type ValidateCartResult = {
  valid: boolean
  errors: ValidateCartError[]
  /** Key name matches the Postgres RPC: `adjusted_quantity`, NOT `quantity`. */
  adjusted_items: Array<{ sku: string | null; adjusted_quantity: number }>
}
