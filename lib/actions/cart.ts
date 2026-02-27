import { getServerSupabase } from '../supabaseClient'
import type { CartItem, ValidateCartResult } from '../../types/cart'

// Server-only wrapper for the `validate_cart` RPC.
export async function validateCart(
  cartItems: CartItem[],
  customerId?: string
): Promise<ValidateCartResult> {
  const supabase = getServerSupabase()

  // Supabase RPC expects a single object param; adjust key to match your DB function signature.
  const payload = { items: cartItems, customer_id: customerId }

  const { data, error } = await supabase.rpc('validate_cart', payload)

  if (error) {
    throw error
  }

  // Best-effort typing: ensure the shape matches frontend expectations.
  return (data as ValidateCartResult) ?? { valid: false, errors: [], adjusted_items: [] }
}
