import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSupabase } from 'lib/supabaseClient';

type EligibilityResult = { eligible: boolean };

async function checkEligibility(productId: string, user_id: string): Promise<boolean> {
  const supabase = getServerSupabase();

  // Use a JSONB containment check to find orders that include the product
  // We rely on the Postgres `@>` operator through the Supabase client `.contains()` helper.
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', user_id)
      .in('status', ['paid', 'delivered'])
      // `.contains` is the Supabase-js helper for jsonb containment
      .contains('items', [{ product_id: productId }]);

    if (error) {
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('product_id');

  const supabase = getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 403 });
  }

  if (!productId) {
    return new NextResponse(JSON.stringify({ error: 'Missing product_id' }), { status: 400 });
  }

  const eligible = await checkEligibility(productId, user.id);
  const result: EligibilityResult = { eligible };

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productId = body?.product_id;

    const supabase = getServerSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 403 });
    }

    if (!productId) {
      return new NextResponse(JSON.stringify({ error: 'Missing product_id' }), { status: 400 });
    }

    const eligible = await checkEligibility(productId, user.id);
    return NextResponse.json({ eligible });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(JSON.stringify({ error: message }), { status: 500 });
  }
}

// TODO: Adjust the DB query if your `orders.items` structure differs (e.g., nested keys or different product_id types).
