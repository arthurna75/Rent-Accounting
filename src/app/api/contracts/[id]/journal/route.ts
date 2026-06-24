import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postJournalEntry } from '@/lib/accounting/journal-service'
import type { JournalEntryType } from '@/types/database'

// 전표유형 → 차변/대변 계정코드 매핑
const ENTRY_LINES: Record<string, { debit: string; credit: string }> = {
  '보증금수령': { debit: '102', credit: '310' },
  '보증금반환': { debit: '310', credit: '102' },
  '임대수익':   { debit: '102', credit: '510' },
  '관리비':     { debit: '102', credit: '520' },
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contractId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 조직 ID 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: '조직 정보를 찾을 수 없습니다.' }, { status: 400 })
  }
  const organizationId = profile.organization_id

  // 계약 조회
  const { data: contract, error: contractError } = await supabase
    .from('lease_contracts')
    .select('id, organization_id, lessee_name, start_date, end_date, monthly_rent, monthly_management_fee, deposit_amount, property_id')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 })
  }

  const body = await req.json()

  // ── 일괄 생성 ──────────────────────────────────────────────
  if (body.bulk === true) {
    const startDate = new Date(contract.start_date)
    const endDate   = new Date(contract.end_date)
    const today     = new Date()
    const limitDate = today < endDate ? today : endDate

    // 이미 등록된 임대수익 엔트리의 year-month 목록 조회
    const { data: linkedLines } = await supabase
      .from('journal_entry_lines')
      .select('journal_entry_id')
      .eq('contract_id', contractId)

    const entryIds = [...new Set((linkedLines ?? []).map(r => r.journal_entry_id as string))]

    const existingMonths = new Set<string>()
    if (entryIds.length > 0) {
      const { data: existingEntries } = await supabase
        .from('journal_entries')
        .select('entry_date, entry_type')
        .in('id', entryIds)
        .eq('entry_type', '임대수익')

      for (const e of existingEntries ?? []) {
        existingMonths.add(e.entry_date.slice(0, 7))
      }
    }

    // 매월 엔트리 생성
    const payDay = startDate.getDate()
    let created = 0
    const errors: string[] = []

    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const limit = new Date(limitDate.getFullYear(), limitDate.getMonth(), 1)

    while (cur <= limit) {
      const yearMonth = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`

      if (!existingMonths.has(yearMonth) && (contract.monthly_rent ?? 0) > 0) {
        const dayStr = String(Math.min(payDay, new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate())).padStart(2, '0')
        const entryDate = `${yearMonth}-${dayStr}`
        const description = `${contract.lessee_name} ${cur.getFullYear()}년 ${cur.getMonth() + 1}월 임대료`

        try {
          await postJournalEntry(
            supabase,
            organizationId,
            {
              entry_date:     entryDate,
              entry_type:     '임대수익',
              description,
              reference_id:   contractId,
              reference_type: 'lease_contracts',
              lines: [
                { account_code: '102', debit_amount: contract.monthly_rent, credit_amount: 0, contract_id: contractId, property_id: (contract as any).property_id ?? undefined },
                { account_code: '510', debit_amount: 0, credit_amount: contract.monthly_rent, contract_id: contractId, property_id: (contract as any).property_id ?? undefined },
              ],
            },
            user.id,
            false,
          )
          created++
        } catch (e) {
          errors.push(`${yearMonth}: ${(e as Error).message}`)
        }
      }

      cur.setMonth(cur.getMonth() + 1)
    }

    return NextResponse.json({ ok: true, created, errors })
  }

  // ── 단건 생성 ──────────────────────────────────────────────
  const { entry_type, amount, entry_date, description } = body as {
    entry_type: JournalEntryType
    amount: number
    entry_date: string
    description?: string
  }

  if (!entry_type || !amount || !entry_date) {
    return NextResponse.json({ error: '필수 필드가 없습니다.' }, { status: 400 })
  }

  const mapping = ENTRY_LINES[entry_type]
  if (!mapping) {
    return NextResponse.json({ error: `지원하지 않는 전표유형: ${entry_type}` }, { status: 400 })
  }

  try {
    const entry = await postJournalEntry(
      supabase,
      organizationId,
      {
        entry_date,
        entry_type,
        description: description ?? `${contract.lessee_name} ${entry_type}`,
        reference_id:   contractId,
        reference_type: 'lease_contracts',
        lines: [
          { account_code: mapping.debit,  debit_amount: amount,  credit_amount: 0,      contract_id: contractId, property_id: (contract as any).property_id ?? undefined },
          { account_code: mapping.credit, debit_amount: 0,       credit_amount: amount, contract_id: contractId, property_id: (contract as any).property_id ?? undefined },
        ],
      },
      user.id,
      false,
    )
    return NextResponse.json({ ok: true, data: entry })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
