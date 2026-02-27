import React from 'react'
import { getServerSupabase } from '../../../lib/supabaseClient'
import DropCountdown from '../../../components/DropCountdown'

type ActiveDrop = {
  id: string
  name: string
  description?: string | null
  ends_at?: string | null
}

export default async function DropsPage() {
  const supabase = getServerSupabase()
  const { data: drops } = await supabase.from('drops').select('*').eq('active', true) as unknown as { data: ActiveDrop[] | null }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Active Drops</h1>
      <div className="space-y-4">
        {Array.isArray(drops) && drops.length > 0 ? (
          drops.map((d) => (
            <div key={d.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-gray-600">{d.description}</div>
              </div>
              <DropCountdown endsAt={d.ends_at ?? ''} />
            </div>
          ))
        ) : (
          <div>No active drops</div>
        )}
      </div>
    </main>
  )
}
