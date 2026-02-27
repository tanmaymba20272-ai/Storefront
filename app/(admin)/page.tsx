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
      const { data, error } = await supabase.auth.getUser()
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

  if (loading) return <div>Checking permissions...</div>

  return (
    <section>
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="mt-4 text-slate-600">Admin-only content goes here.</p>
    </section>
  )
}
