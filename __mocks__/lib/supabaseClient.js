const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  })),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
}

const supabase = mockSupabaseClient
const getServerSupabase = jest.fn(() => mockSupabaseClient)
const createServerSupabaseClient = jest.fn(() => mockSupabaseClient)

module.exports = { supabase, getServerSupabase, createServerSupabaseClient }
