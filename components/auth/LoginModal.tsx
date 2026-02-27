'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Email and password required')
      return
    }
    setLoading(true)
    const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signErr) {
      setError(signErr.message)
      return
    }

    // role-based routing
    const user = data?.user
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = (profile as any)?.role
      if (role === 'admin') router.push('/admin')
      else router.push('/')
    }
    onClose()
  }

  async function handleOAuth(provider: 'google' | 'apple' | 'facebook') {
    setLoading(true)
    await supabase.auth.signInWithOAuth({ provider })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md max-w-md w-full p-6">
        <h2 className="text-lg font-semibold">Log in</h2>
        <form onSubmit={handleLogin} className="mt-4 space-y-3">
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
              {loading ? 'Loading...' : 'Sign in'}
            </button>
            <button type="button" className="text-sm text-slate-600" onClick={onClose}>Cancel</button>
          </div>
        </form>

        <div className="mt-4 border-t pt-4 space-y-2">
          <div className="text-sm text-slate-600">Or continue with</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleOAuth('google')} className="flex-1 px-3 py-2 border rounded">Google</button>
            <button onClick={() => handleOAuth('apple')} className="flex-1 px-3 py-2 border rounded">Apple</button>
            <button onClick={() => handleOAuth('facebook')} className="flex-1 px-3 py-2 border rounded">Facebook</button>
          </div>
        </div>
      </div>
    </div>
  )
}
