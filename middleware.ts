import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side middleware guard for /admin routes.
// Behavior:
// - If no Supabase session cookie is present, redirect to `/`.
// - If SUPABASE_SERVICE_ROLE_KEY is provided, try to verify the user's role === 'admin' by
//   using the service role to query the `profiles` table. If verification fails, redirect.
// Note: Do NOT commit your service role key. If you want strict role checks in middleware,
// set SUPABASE_SERVICE_ROLE_KEY in your environment (not checked in git).

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // Common Supabase session cookie keys
  const token = request.cookies.get('sb:token')?.value || request.cookies.get('supabase-auth-token')?.value

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // If the service role key is present, try to validate role === 'admin'.
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Get user from token
      const { data: userRes } = await supabase.auth.getUser(token)
      const userId = userRes?.user?.id
      if (!userId) throw new Error('no-user')

      const { data: profiles } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .limit(1) as unknown as { data: Array<{ role: string }> | null }

      const role = Array.isArray(profiles) && profiles.length > 0 ? profiles[0].role : null
      if (role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      return NextResponse.next()
    } catch (_err: unknown) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Fallback: token present, but no server-side role check available -> allow.
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
