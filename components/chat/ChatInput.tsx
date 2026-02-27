"use client"

import React, { useEffect, useState } from 'react'
import SuggestionChips from './SuggestionChips'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabaseClient'

type Props = {
  onSubmit: (text: string, mode?: string) => Promise<void>
  supabase: SupabaseClient<Database>
  onRequestLogin?: () => void
}

export default function ChatInput({ onSubmit, supabase, onRequestLogin }: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<string | undefined>(undefined)
  const [user, setUser] = useState<User | null>(null)
  const [orderId, setOrderId] = useState('')
  const [orderEmail, setOrderEmail] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        setUser(data.user ?? null)
      } catch {
        setUser(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, [supabase])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text && mode !== 'track') return
    setSubmitting(true)
    try {
      if (mode === 'track') {
        if (!user) {
          // trigger login flow — request parent to open modal if provided
          if (typeof onRequestLogin === 'function') {
            onRequestLogin()
          } else {
            window.location.href = '/login'
          }
          return
        }
        // if order fields provided, include them
        const payload = `Track order ${orderId} ${orderEmail}`.trim()
        await onSubmit(payload, 'track')
        setOrderId('')
        setOrderEmail('')
      } else {
        await onSubmit(text, mode)
        setText('')
      }
      setMode(undefined)
    } catch {
      // onSubmit error is handled by the parent (ChatWidget streams the error into the message list)
    } finally {
      setSubmitting(false)
    }
  }

  function applySuggestion(s: string) {
    setText(s)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <SuggestionChips onSelect={(s) => { applySuggestion(s); setMode(undefined) }} />

      {mode === 'track' ? (
        <div className="mt-2">
              {!user ? (
            <div className="flex items-center justify-between space-x-2">
              <div className="text-sm text-[#041526]">Please log in to track orders.</div>
              <button type="button" onClick={() => (typeof onRequestLogin === 'function' ? onRequestLogin() : (window.location.href = '/login'))} className="text-[#D4AF37]">
                Log in
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID" className="w-full rounded-md border px-2 py-1" />
              <input value={orderEmail} onChange={(e) => setOrderEmail(e.target.value)} placeholder="Email" className="w-full rounded-md border px-2 py-1" />
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-2 flex items-center space-x-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              void handleSubmit()
            }
          }}
          placeholder="Ask a question..."
          className="flex-1 resize-none rounded-md border px-2 py-1 text-sm"
          rows={2}
          aria-label="Chat input"
        />
        <button disabled={submitting} type="submit" className="rounded bg-[#041526] px-3 py-1 text-[#F8F4EC]">
          Send
        </button>
      </div>

      <div className="mt-2 flex items-center space-x-2">
        <button type="button" onClick={() => setMode('track')} className="text-sm text-[#041526] underline">
          Track my order
        </button>
      </div>
    </form>
  )
}
