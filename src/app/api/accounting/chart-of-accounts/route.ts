import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AccountType } from '@/types/database'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const accountType = searchParams.get('account_type')

  let query = supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (q) {
    query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`)
  }

  if (accountType) {
    query = query.eq('account_type', accountType as AccountType)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
