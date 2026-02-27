import { getServerSupabase } from '../supabase';

type SubmitArgs = {
  product_id: string;
  rating: number;
  body?: string | null;
  media_urls?: string[] | null;
};

type SubmitResult = { success: boolean; review_id?: string; error?: string };

async function userPurchased(productId: string, user_id: string): Promise<boolean> {
  const { supabase } = getServerSupabase();
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user_id)
      .in('status', ['paid', 'delivered'])
      .contains('items', [{ product_id: productId }]);

    if (error) {
      console.error('userPurchased DB error', error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch (err: unknown) {
    console.error('userPurchased unexpected error', err);
    return false;
  }
}

export async function submitReview(args: SubmitArgs): Promise<SubmitResult> {
  const { product_id, rating, body = null, media_urls = null } = args;
  const { supabase } = getServerSupabase();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr) {
    return { success: false, error: userErr.message };
  }
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const eligible = await userPurchased(product_id, user.id);

  try {
    const insertPayload = {
      user_id: user.id,
      product_id,
      rating,
      body,
      media_urls,
      verified_purchase: eligible,
    } as any;

    const { data, error } = await supabase.from('reviews').insert(insertPayload).select('id').single();
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, review_id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// TODO: Consider rate-limiting review submissions and validating media_urls (signed URL checks) on the server-side.
