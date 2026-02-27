'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function check() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      const user = data?.user
      if (!user) {
        router.push('/')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/')
        return
      }
      setLoading(false)
    }
    check()
    return () => { mounted = false }
  }, [router])

  if (loading) return <div className="flex min-h-screen items-center justify-center font-sans text-stone">Checking permissions…</div>

  return (
    <main className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-screen-lg">
        <h1 className="font-serif text-3xl text-navy md:text-4xl">Admin Dashboard</h1>
        <p className="mt-4 font-sans text-stone">Admin-only content goes here.</p>
      </div>
    </main>
  )
}
