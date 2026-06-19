import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AccountType, NormalBalance } from '@/types/database'

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()
  return data?.organization_id ?? null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q           = searchParams.get('q')
  const accountType = searchParams.get('account_type')
  const allActive   = searchParams.get('all') === '1' // 비활성 포함 여부

  let query = supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('organization_id', orgId)
    .order('code', { ascending: true })

  if (!allActive) query = query.eq('is_active', true)
  if (q)           query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`)
  if (accountType) query = query.eq('account_type', accountType as AccountType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    code: string
    name: string
    account_type: AccountType
    account_subtype?: string
    normal_balance: NormalBalance
    description?: string
  }

  if (!body.code?.trim())          return NextResponse.json({ error: '계정코드를 입력하세요.' }, { status: 400 })
  if (!body.name?.trim())          return NextResponse.json({ error: '계정명을 입력하세요.' }, { status: 400 })
  if (!body.account_type)          return NextResponse.json({ error: '계정유형을 선택하세요.' }, { status: 400 })
  if (!body.normal_balance)        return NextResponse.json({ error: '잔액방향을 선택하세요.' }, { status: 400 })

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert({
      organization_id: orgId,
      code:            body.code.trim(),
      name:            body.name.trim(),
      account_type:    body.account_type,
      account_subtype: body.account_subtype?.trim() || null,
      normal_balance:  body.normal_balance,
      description:     body.description?.trim() || null,
      is_system:       false,
      is_active:       true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: `계정코드 '${body.code}'는 이미 사용 중입니다.` }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
