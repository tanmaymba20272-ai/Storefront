"use server"

import { NextResponse } from 'next/server'
import { getServerSupabase } from '../../../lib/supabaseClient'
import { decryptSettings } from '../../../lib/encryption'

export async function GET() {
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'RAZORPAY_KEY_ID')
      .limit(1)
      .single()

    if (error || !data || !data.value) {
      return NextResponse.json({ error: 'KEY_NOT_CONFIGURED' }, { status: 404 })
    }

    const keyId = await decryptSettings(data.value)
    return NextResponse.json({ key_id: keyId }, { status: 200 })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'UNKNOWN_ERROR' }, { status: 500 })
  }
}

export default GET
