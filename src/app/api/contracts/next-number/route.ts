import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = new Date().getFullYear()

  const { count } = await supabase
    .from('lease_contracts')
    .select('*', { count: 'exact', head: true })
    .like('contract_number', `${year}-%`)

  const next = (count ?? 0) + 1
  return NextResponse.json({ number: `${year}-${String(next).padStart(2, '0')}` })
}
