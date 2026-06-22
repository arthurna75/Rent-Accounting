import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  const yyyy  = today.getFullYear()
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const dd    = String(today.getDate()).padStart(2, '0')
  const prefix = `${yyyy}${mm}${dd}`   // e.g. 20260622

  const { count } = await supabase
    .from('lease_contracts')
    .select('*', { count: 'exact', head: true })
    .like('contract_number', `${prefix}_%`)

  const next = (count ?? 0) + 1
  return NextResponse.json({ number: `${prefix}_${String(next).padStart(2, '0')}` })
}
