import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 카드대금 전용 미지급금 계정 코드
const CARD_PAYABLE_CODE = '322'

/**
 * GET /api/accounting/card-settlement
 * 카드사(거래처)별 미결제 카드대금(미지급금 322) 잔액 집계.
 * 잔액 = Σ(대변) - Σ(차변)  (부채 정상잔액: 대변)
 * 잔액 > 0 인 거래처만 반환.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 1) 미지급금(322) 계정 ID 조회
  const { data: account } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('code', CARD_PAYABLE_CODE)
    .single()

  if (!account) {
    return NextResponse.json({ data: [] })
  }

  // 2) 해당 계정의 분개 라인 + 부모 전표(상태/거래처) 조회
  const { data: lines, error } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit_amount,
      credit_amount,
      entry:journal_entries!journal_entry_id ( status, vendor_id )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('account_id', account.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 3) 거래처(카드사)별 잔액 집계 — posted 전표만
  const balances = new Map<string, number>() // key: vendor_id | '__none__'
  for (const l of lines ?? []) {
    const entry = (l as { entry: { status: string; vendor_id: string | null } | null }).entry
    if (!entry || entry.status !== 'posted') continue
    const key = entry.vendor_id ?? '__none__'
    balances.set(key, (balances.get(key) ?? 0) + Number(l.credit_amount) - Number(l.debit_amount))
  }

  // 4) 거래처명 조회
  const vendorIds = [...balances.keys()].filter(k => k !== '__none__')
  const vendorNames = new Map<string, string>()
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name')
      .in('id', vendorIds)
    for (const v of vendors ?? []) vendorNames.set(v.id, v.name)
  }

  const result = [...balances.entries()]
    .filter(([, outstanding]) => outstanding > 0.001)
    .map(([key, outstanding]) => ({
      vendor_id: key === '__none__' ? null : key,
      vendor_name: key === '__none__' ? '(카드사 미지정)' : (vendorNames.get(key) ?? '(알 수 없음)'),
      outstanding,
    }))
    .sort((a, b) => b.outstanding - a.outstanding)

  return NextResponse.json({ data: result })
}
