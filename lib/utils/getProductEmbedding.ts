import 'server-only'
import { getServerSupabase } from '../supabaseClient'
import { decryptSettings } from './encryption'

/**
 * Fetches an embedding from OpenAI's text-embedding-3-small API (1536 dimensions)
 * for a given product description or name.
 *
 * The LLM API key is retrieved dynamically from encrypted store_settings
 * (per-request model, same as DECISION 30 for Shiprocket).
 *
 * @param text The product name or description to embed
 * @returns Promise<{ embedding: number[] }> — 1536-dimensional embedding vector
 * @throws Error if LLM API key is not configured or API call fails
 */
export async function getProductEmbedding(text: string): Promise<{ embedding: number[] }> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot embed empty text')
  }

  // Fetch encrypted LLM API key from store_settings
  const supabase = getServerSupabase()
  const { data: settings, error: fetchErr } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'LLM_API_KEY')
    .single()

  if (fetchErr || !settings) {
    throw new Error('LLM_API_KEY not configured in store_settings')
  }

  let apiKey: string
  try {
    const decrypted = await decryptSettings(settings.value as unknown as string)
    // Extract actual key from format "provider:token"
    const parts = decrypted.split(':')
    apiKey = parts.length > 1 ? parts[1] : decrypted
  } catch (e) {
    throw new Error('Failed to decrypt LLM_API_KEY from store_settings')
  }

  // Call OpenAI embedding API
  // Model: text-embedding-3-small (1536 dimensions)
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.trim().slice(0, 8191), // OpenAI token limit per request
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>
    }
    if (!data.data || data.data.length === 0) {
      throw new Error('No embedding returned from OpenAI')
    }

    return { embedding: data.data[0]!.embedding }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Embedding generation failed: ${String(error)}`)
  }
}
