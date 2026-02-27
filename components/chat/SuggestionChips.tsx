"use client"

import React from 'react'

export default function SuggestionChips({ onSelect }: { onSelect: (s: string) => void }) {
  const suggestions = ['What are your materials?', 'Track my order', 'Return policy']

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="rounded-full border px-3 py-1 text-sm text-[#041526]"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
