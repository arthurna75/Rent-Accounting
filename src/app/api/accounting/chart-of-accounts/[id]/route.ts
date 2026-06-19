import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { NormalBalance } from '@/types/database'

type Ctx = { params: Promise<{ id: string }> }

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()
  return data?.organization_id ?? null
}

// ── PATCH: 계정과목 수정 ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: account, error: fetchErr } = await supabase
    .from('chart_of_accounts')
    .select('id, is_system, organization_id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (fetchErr || !account) return NextResponse.json({ error: '계정과목을 찾을 수 없습니다.' }, { status: 404 })

  const body = await req.json() as {
    name?: string
    account_subtype?: string
    normal_balance?: NormalBalance
    description?: string
    is_active?: boolean
  }

  type CoaUpdate = {
    name?: string
    account_subtype?: string | null
    normal_balance?: NormalBalance
    description?: string | null
    is_active?: boolean
  }

  let updates: CoaUpdate

  if (account.is_system) {
    // 시스템 계정: is_active 토글만 허용
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: '시스템 계정은 활성/비활성만 변경할 수 있습니다.' }, { status: 400 })
    }
    updates = { is_active: body.is_active }
  } else {
    // 사용자 계정: 이름·세부유형·잔액방향·설명·활성 변경 가능
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: '계정명을 입력하세요.' }, { status: 400 })
    }
    updates = {}
    if (body.name             !== undefined) updates.name            = body.name.trim()
    if (body.account_subtype  !== undefined) updates.account_subtype = body.account_subtype?.trim() || null
    if (body.normal_balance   !== undefined) updates.normal_balance  = body.normal_balance
    if (body.description      !== undefined) updates.description     = body.description?.trim() || null
    if (body.is_active        !== undefined) updates.is_active       = body.is_active
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// ── DELETE: 계정과목 삭제 ─────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: account, error: fetchErr } = await supabase
    .from('chart_of_accounts')
    .select('id, is_system, organization_id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (fetchErr || !account) return NextResponse.json({ error: '계정과목을 찾을 수 없습니다.' }, { status: 404 })
  if (account.is_system)    return NextResponse.json({ error: '시스템 계정은 삭제할 수 없습니다.' }, { status: 400 })

  // journal_entry_lines 는 account_id (UUID) 로 chart_of_accounts 를 참조
  const { count: lineCount } = await supabase
    .from('journal_entry_lines')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id)

  if ((lineCount ?? 0) > 0) {
    return NextResponse.json(
      { error: '이 계정과목은 분개 내역에서 사용 중이므로 삭제할 수 없습니다. 비활성화를 이용하세요.' },
      { status: 409 },
    )
  }

  const { error } = await supabase
    .from('chart_of_accounts')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
