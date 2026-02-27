import { getServerSupabase } from '../supabaseClient'
import { decryptSettings } from '../encryption'

/**
 * Server-only helper to fetch and decrypt Razorpay settings.
 * Do NOT call from client bundles. Returns both id and secret for server-side SDK usage only.
 */
export async function getRazorpayKeys(): Promise<{ keyId: string; keySecret: string }> {
  const supabase = getServerSupabase()

  const { data: idRow, error: idErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'RAZORPAY_KEY_ID')
    .limit(1)
    .single()

  if (idErr || !idRow || !idRow.value) {
    throw new Error('RAZORPAY_KEY_ID not found in store_settings')
  }

  const { data: secretRow, error: secretErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'RAZORPAY_KEY_SECRET')
    .limit(1)
    .single()

  if (secretErr || !secretRow || !secretRow.value) {
    throw new Error('RAZORPAY_KEY_SECRET not found in store_settings')
  }

  const keyId = await decryptSettings(idRow.value)
  const keySecret = await decryptSettings(secretRow.value)

  if (!keyId || !keySecret) throw new Error('Razorpay keys missing after decryption')

  return { keyId, keySecret }
}

export default getRazorpayKeys
