import { getServerSupabase } from '../supabaseClient'
import { decryptSettings } from '../encryption'

/**
 * Server-only helper to fetch and decrypt Razorpay settings.
 * Do NOT call from client bundles. Returns id, secret and webhook secret for server-side usage only.
 */
export async function getRazorpayKeys(): Promise<{ keyId?: string; keySecret?: string; webhookSecret?: string }> {
  const supabase = getServerSupabase()

  const { data: idRow, error: idErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'RAZORPAY_KEY_ID')
    .limit(1)
    .single()

  const { data: secretRow, error: secretErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'RAZORPAY_KEY_SECRET')
    .limit(1)
    .single()

  const { data: webhookRow, error: webhookErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'RAZORPAY_WEBHOOK_SECRET')
    .limit(1)
    .single()

  if (idErr || !idRow || !idRow.value) {
    // key id missing is not always fatal for webhook verification, so don't throw here
  }

  if (secretErr || !secretRow || !secretRow.value) {
    // key secret missing is not fatal for webhook verification either
  }

  const keyId = idRow && idRow.value ? await decryptSettings(idRow.value) : undefined
  const keySecret = secretRow && secretRow.value ? await decryptSettings(secretRow.value) : undefined
  const webhookSecret = webhookRow && webhookRow.value ? await decryptSettings(webhookRow.value) : undefined

  return { keyId, keySecret, webhookSecret }
}

export default getRazorpayKeys
