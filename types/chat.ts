/**
 * Shared chat message type used by ChatWidget, ChatMessages, and tests.
 * Single source of truth — do not redefine locally in components.
 */
export type ChatMessage = {
  id: string
  role: 'user' | 'bot'
  text: string
}
