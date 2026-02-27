"use client"

import React, { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/chat'

export default function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // auto-scroll to bottom on new messages
    const el = listRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  return (
    <div className="h-64 overflow-y-auto p-2" ref={listRef}>
      {messages.map((m) => (
        <div key={m.id} className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] whitespace-pre-wrap rounded-md px-3 py-2 ${
              m.role === 'user' ? 'bg-navy text-cream' : 'bg-white text-navy'
            }`}
          >
            {m.role === 'bot' ? (
              <div aria-live="polite">{m.text || <em className="opacity-60">...</em>}</div>
            ) : (
              <div>{m.text}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
