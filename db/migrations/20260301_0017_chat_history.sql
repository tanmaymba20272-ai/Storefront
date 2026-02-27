-- Migration: Create chat history tables
-- Date: 2026-03-01
-- Purpose: Store chat sessions and messages for authenticated users

-- Create public.chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create public.chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'bot')),
  text text NOT NULL,
  intent text,
  created_at timestamptz DEFAULT now()
);

-- Create unique index on session_id, created_at for efficient ordering
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_session_created ON public.chat_messages (session_id, created_at);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
-- Authenticated users can read/write only their own sessions
CREATE POLICY "Users read own sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
-- Authenticated users can read/write messages from their own sessions
CREATE POLICY "Users read own session messages" ON public.chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users create messages in own sessions" ON public.chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own messages" ON public.chat_messages
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Deny anon access (deny-by-default)
CREATE POLICY "Deny anon sessions" ON public.chat_sessions
  FOR ALL USING (FALSE) WITH CHECK (FALSE);

CREATE POLICY "Deny anon messages" ON public.chat_messages
  FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- End of migration
