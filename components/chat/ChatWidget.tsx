"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import LoginModal from '../auth/LoginModal'
import { supabase } from '../../lib/supabaseClient'
import type { ChatMessage } from '../../types/chat'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasUnread, setHasUnread] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const historyLoadedRef = useRef(false)

  /**
   * Load chat history on mount for authenticated users.
   * Calls GET /api/chat/history to fetch the most recent session's messages.
   * Fails gracefully — if fetch fails or user is anon, continues with empty messages.
   */
  useEffect(() => {
    if (historyLoadedRef.current) return // Only load once

    const loadHistory = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) {
          // User is not authenticated — start with empty messages
          return
        }

        // User is authenticated — fetch chat history
        const response = await fetch('/api/chat/history', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          // Fetch failed (401, 500, etc.) — continue with empty messages gracefully
          console.warn(`Failed to load chat history: ${response.status}`)
          return
        }

        const { messages: historyMessages } = await response.json() as { messages: ChatMessage[] }
        if (historyMessages && historyMessages.length > 0) {
          setMessages(historyMessages)
        }
      } catch (_err) {
        // Network error, parsing error, etc. — continue gracefully with empty messages
        return
      }
    }

    historyLoadedRef.current = true
    loadHistory()
  }, [])

  useEffect(() => {
    // example: mark unread when bot adds a message while closed
    if (!open && messages.some((m) => m.role === 'bot' && m.text.length > 0)) {
      setHasUnread(true)
    }
  }, [messages, open])

  useEffect(() => {
    if (open) setHasUnread(false)
  }, [open])

  function handleClose() {
    setOpen(false)
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }

  async function handleSubmit(text: string, mode?: string) {
    const id = String(Date.now())
    setMessages((m) => [...m, { id, role: 'user', text }])

    // add empty bot message to be filled by stream
    const botId = `bot-${Date.now()}`
    setMessages((m) => [...m, { id: botId, role: 'bot', text: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode }),
        signal: controller.signal,
      })

      if (!res.ok) {
        if (res.status === 401) throw new Error('unauthorized')
        if (res.status === 429) throw new Error('rate_limited')
        throw new Error('server_error')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('no_stream')
      const decoder = new TextDecoder()

      // stream tokens and append to bot message
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages((prev) => {
          return prev.map((msg) => (msg.id === botId ? { ...msg, text: msg.text + chunk } : msg))
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'error'
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'bot', text: `Error: ${message}` }])
    } finally {
      abortRef.current = null
    }
  }

  return (
    <div>
      {/* Floating button */}
      <button
        aria-label="Open chat"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-50 rounded-full p-3 shadow-lg bg-[#041526] text-[#F8F4EC] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
      >
        Chat
        {hasUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#D4AF37]" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-panel-heading"
            className="fixed right-6 bottom-20 z-50 w-80 max-w-sm rounded-lg bg-[#F8F4EC] shadow-2xl ring-1 ring-slate-900/5"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 id="chat-panel-heading" className="text-[#041526] font-semibold">Support</h3>
              <div className="flex items-center space-x-2">
                <button
                  aria-label="Close chat"
                  onClick={handleClose}
                  className="text-[#041526] hover:text-[#D4AF37]"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-3">
              <ChatMessages messages={messages} />
              <ChatInput onSubmit={handleSubmit} supabase={supabase} onRequestLogin={() => setShowLogin(true)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
