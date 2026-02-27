'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function RegisterModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Email and password required')
      return
    }
    setLoading(true)
    const { data, error: signErr } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (signErr) {
      setError(signErr.message)
      return
    }

    // Create profile row if needed (best-effort)
    const user = data?.user
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, email, display_name: displayName, role: 'customer' })
      router.push('/')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md max-w-md w-full p-6">
        <h2 className="text-lg font-semibold">Create account</h2>
        <form onSubmit={handleRegister} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm">Full name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2"
              required
            />
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center justify-between gap-3">
            <button type="submit" className="px-4 py-2 bg-black text-white rounded-md" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
            <button type="button" className="text-sm text-slate-600" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
