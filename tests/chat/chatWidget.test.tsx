import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatWidget from '../../components/chat/ChatWidget'

function makeStream(chunks: string[]) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
}

describe('ChatWidget', () => {
  beforeEach(() => {
    // minimal supabase env may be used by the widget; ensure not to crash
    // mock fetch for /api/chat
    // @ts-ignore
    global.fetch = jest.fn((input: RequestInfo) => {
      if (String(input).includes('/api/chat')) {
        return Promise.resolve({ ok: true, body: makeStream(['Hello ', 'there!']) } as any)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any)
    })
  })

  it('renders button and opens panel and streams tokens', async () => {
    render(<ChatWidget />)
    const btn = screen.getByRole('button', { name: /open chat/i })
    fireEvent.click(btn)

    // input should be present
    const textarea = await screen.findByLabelText(/chat input/i)
    fireEvent.change(textarea, { target: { value: 'Hi' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' })

    await waitFor(() =>
      expect(screen.getByText((content) => content.includes('Hello'))).toBeInTheDocument()
    )
  })
})
