import { getServerSupabase } from '../supabaseClient'
import { decryptSettings } from '../encryption'

type LlmKey = { provider: string; apiKey: string }

// Server-only helper: resolves the encrypted LLM API key stored in store_settings
export async function getLlmKey(): Promise<LlmKey> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'LLM_API_KEY')
    .limit(1)
    .single()

  if (error || !data) {
    throw new Error('LLM_API_KEY not found in store_settings')
  }

  let decrypted: string
  try {
    decrypted = await decryptSettings(data.value)
  } catch (err: unknown) {
    throw new Error('Failed to decrypt LLM_API_KEY: ' + String(err))
  }

  // Decrypted value can be either a plain api key string or JSON with metadata
  try {
    const parsed = JSON.parse(decrypted)
    const provider = typeof parsed.provider === 'string' ? parsed.provider : 'openai'
    const apiKey = parsed.apiKey || parsed.api_key || parsed.key
    if (!apiKey || typeof apiKey !== 'string') throw new Error('Missing apiKey')
    return { provider, apiKey }
  } catch (e) {
    // Not JSON — treat as plain API key and default provider to openai
    return { provider: 'openai', apiKey: decrypted }
  }
}

export default getLlmKey
