import { getServerSupabase } from 'lib/supabase-server';
import getEmailKey from 'lib/utils/getEmailKey';

type BroadcastPayload = {
  subject: string;
  html: string;
  test?: boolean;
};

export async function POST(req: Request) {
  const { supabase } = getServerSupabase();

  // Auth check
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  // Get profile role and email
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? null;
  const adminEmail = (profile?.email as string) || (user.email ?? null);

  if (role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  let payload: BroadcastPayload;
  try {
    payload = (await req.json()) as BroadcastPayload;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Invalid JSON', message: msg }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!payload?.subject || !payload?.html) {
    return new Response('Missing subject or html', { status: 400 });
  }

  const { apiKey } = await getEmailKey();
  if (!apiKey) return new Response(JSON.stringify({ error: 'Email provider key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Determine recipients
  let recipients: { email: string }[] = [];

  // try marketing_opt_in true first
  const r1 = await supabase.from('profiles').select('email').eq('marketing_opt_in', true);
  if (!r1.error && Array.isArray(r1.data) && r1.data.length > 0) {
    recipients = r1.data.filter((r: any) => r?.email).map((r: any) => ({ email: r.email }));
  } else {
    // fallback: all profiles with non-null email
    const r2 = await supabase.from('profiles').select('email').not('email', 'is', null);
    if (!r2.error && Array.isArray(r2.data)) {
      recipients = r2.data.filter((r: any) => r?.email).map((r: any) => ({ email: r.email }));
    }
  }

  if (payload.test) {
    if (!adminEmail) return new Response(JSON.stringify({ error: 'Admin email not available for test' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    // only send to admin
    try {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `no-reply@${process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || 'example.com'}`,
          to: adminEmail,
          subject: payload.subject,
          html: payload.html,
        }),
      });

      const json = await sendRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ sent: 1, provider: json }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Normal send to all recipients
  const emails = recipients.map(r => r.email).filter(Boolean);
  if (emails.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `no-reply@${process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || 'example.com'}`,
        to: emails,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!sendRes.ok) {
      const body = await sendRes.text().catch(() => '');
      return new Response(JSON.stringify({ error: body }), { status: sendRes.status, headers: { 'Content-Type': 'application/json' } });
    }

    // Resend returns send details. We don't expose the API key.
    return new Response(JSON.stringify({ sent: emails.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}

// TODO: Ensure this route runs in a secure runtime (Edge preferred) and never exposes the EMAIL_API_KEY.
// TODO: Consider batching / rate-limiting and queued background sends for large recipient lists.