import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/api'
import type { ChatMessage } from '@/types/chat'

/**
 * GET /api/chat/history
 *
 * Fetches the most recent chat session's messages for the authenticated user.
 * Requires authentication via Authorization header or session cookie.
 *
 * Response: { messages: ChatMessage[] }
 * Error: 401 if not authenticated, 500 if query fails
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()

    // Create auth-aware Supabase client (DECISION 43)
    const authClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Verify authentication
    const { data: authData, error: authError } = await authClient.auth.getUser()
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: 'User not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Use service-role client for privileged data query
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Fetch the most recent session for this user
    const { data: sessions, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessionError) {
      console.error('Session fetch error:', sessionError)
      return new Response(
        JSON.stringify({ error: 'query_failed', message: 'Failed to fetch sessions' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!sessions || sessions.length === 0) {
      // No previous sessions — return empty history
      return new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const sessionId = sessions[0].id

    // Fetch all messages from this session, ordered oldest first
    const { data: messages, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, role, text, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (messageError) {
      console.error('Message fetch error:', messageError)
      return new Response(
        JSON.stringify({ error: 'query_failed', message: 'Failed to fetch messages' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Map to ChatMessage type
    const chatMessages: ChatMessage[] = (messages ?? []).map((msg: {
      id: string
      role: string
      text: string
      created_at: string
    }) => ({
      id: msg.id,
      role: msg.role as 'user' | 'bot',
      text: msg.text,
    }))

    return new Response(JSON.stringify({ messages: chatMessages }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Chat history error:', message)
    return new Response(
      JSON.stringify({ error: 'internal_error', message: 'Failed to fetch chat history' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
