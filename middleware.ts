import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/api'

// Server-side middleware guard for /admin routes (T2-06 fix — DECISION 43).
// Uses @supabase/ssr createServerClient so cookie rotation + Set-Cookie headers
// are handled automatically. Manual cookie name heuristics are no longer needed.
//
// Behavior:
// - Verifies browser session via getUser() on the anon-key cookie-aware client.
// - If SUPABASE_SERVICE_ROLE_KEY is present, additionally verifies profiles.role === 'admin'.
// - Any failure → redirect to `/`.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!supabaseUrl || !supabaseAnonKey) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Mutable response so cookie mutations from setAll propagate to the browser.
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response.cookies.set(name, value, options as any)
        )
      },
    },
  })

  // getUser() re-validates the JWT with the Supabase auth server on every call (DECISION 31).
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // If service role key is present, strictly verify role === 'admin'.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey)
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .limit(1)

      const role =
        Array.isArray(profiles) && profiles.length > 0
          ? (profiles[0] as { role: string }).role
          : null

      if (role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    } catch {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
