import { getServerSupabase } from '../supabaseClient'
import { decryptSettings } from '../encryption'

/**
 * Obtain a Shiprocket token using credentials stored in `store_settings`.
 *
 * Notes:
 * - This function reads `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` from the
 *   `store_settings` table and decrypts them via `decryptSettings()`.
 * - Shiprocket tokens are short-lived and are intended to be used per-request.
 *   Consider adding a caching layer (Redis / in-memory with TTL) for production.
 * - Returns an object `{ token }` where `token` is the Bearer token for Shiprocket.
 */
export async function getShiprocketToken(): Promise<{ token: string }> {
  const supabase = getServerSupabase()

  // Load encrypted settings server-side (RLS protected)
  const { data: emailRow, error: emailErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'SHIPROCKET_EMAIL')
    .single()

  const { data: passRow, error: passErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'SHIPROCKET_PASSWORD')
    .single()

  if (emailErr || passErr || !emailRow?.value || !passRow?.value) {
    throw new Error('Shiprocket credentials not found in store_settings')
  }

  const email = decryptSettings(emailRow.value)
  const password = decryptSettings(passRow.value)

  if (!email || !password) {
    throw new Error('Shiprocket credentials are empty after decryption')
  }

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch (_e) {
      body = await res.text()
    }
    throw new Error(`Shiprocket auth failed: ${res.status} ${JSON.stringify(body)}`)
  }

  const json = await res.json()
  const token:
    | string
    | undefined = json?.response?.token || json?.data?.token || json?.token

  if (!token) {
    throw new Error('Shiprocket auth response did not contain a token')
  }

  return { token }
}

export default getShiprocketToken
