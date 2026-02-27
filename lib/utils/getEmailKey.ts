import { getServerSupabase } from '../supabaseClient';
import { decryptSettings } from '../encryption';

// Server-only helper to read (and decrypt) EMAIL_API_KEY from store_settings.
// NOTE: This must only run server-side (do not import into client bundles).
// TODO: Consider caching the decrypted API key with a short TTL (e.g., 60s)
//       to reduce decrypt ops; do NOT cache secrets in module-level variables
//       without a secure TTL-aware cache.
export async function getEmailKey(): Promise<{ apiKey: string | null }> {
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'EMAIL_API_KEY')
    .single();

  if (error) {
    return { apiKey: null };
  }

  if (!data?.value) return { apiKey: null };

  try {
    const decrypted = await decryptSettings(data.value);
    return { apiKey: decrypted };
  } catch (e: unknown) {
    return { apiKey: null };
  }
}

export default getEmailKey;