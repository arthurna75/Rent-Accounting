import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFiscalYear } from '@/lib/accounting/journal-service'

// Step 3에서 전달되는, 이미 저장된 호실 정보 (Step 1→2에서 /properties로 저장)
interface SavedRoom {
  unitNumber: string
  propertyId: string
  contractId: string | null
  landValue: number
  buildingValue: number
  depositAmount: number
  tenantName: string | null
}

interface AccountsInput {
  land_id: string
  building_id: string
  deposit_id: string | null
  loan_id: string | null
  capital_id: string
}

interface JournalPayload {
  buildingName: string
  conversionDate: string
  savedRooms: SavedRoom[]
  accounts: AccountsInput
  loanAmount: number
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'accountant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = profile.organization_id
  const body: JournalPayload = await req.json()
  const { buildingName, conversionDate, savedRooms, accounts, loanAmount } = body

  if (!buildingName || !conversionDate || !savedRooms?.length) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 422 })
  }

  // ── 회계연도 및 전표번호 ────────────────────────────────
  const entryYear = new Date(conversionDate).getFullYear()

  let fiscalYear
  try {
    fiscalYear = await getFiscalYear(supabase, orgId, entryYear)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const { data: entryNumber, error: seqError } = await supabase
    .rpc('next_entry_number', { p_org_id: orgId, p_year: entryYear })

  if (seqError || !entryNumber) {
    return NextResponse.json({ error: '전표번호 채번 실패' }, { status: 500 })
  }

  // ── 전표 헤더 INSERT ─────────────────────────────────────
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      organization_id: orgId,
      fiscal_year_id:  fiscalYear.id,
      entry_number:    entryNumber,
      entry_date:      conversionDate,
      description:     `${buildingName} 복식부기 전환 개시분개`,
      entry_type:      '일반' as const,
      status:          'posted' as const,
      created_by:      user.id,
    })
    .select('id')
    .single()

  if (entryError || !entry) {
    return NextResponse.json({ error: `전표 저장 실패: ${entryError?.message}` }, { status: 500 })
  }

  // ── 분개 라인 빌드 ────────────────────────────────────────
  const lines: Array<{
    journal_entry_id: string
    organization_id: string
    account_id: string
    debit_amount: number
    credit_amount: number
    description: string | null
    property_id: string | null
    contract_id: string | null
    line_order: number
  }> = []

  let order = 0

  // 차변: 호실별 토지
  for (const room of savedRooms) {
    if (room.landValue > 0) {
      lines.push({
        journal_entry_id: entry.id,
        organization_id:  orgId,
        account_id:       accounts.land_id,
        debit_amount:     room.landValue,
        credit_amount:    0,
        description:      `${room.unitNumber} 토지`,
        property_id:      room.propertyId,
        contract_id:      null,
        line_order:       order++,
      })
    }
  }

  // 차변: 호실별 건물
  for (const room of savedRooms) {
    if (room.buildingValue > 0) {
      lines.push({
        journal_entry_id: entry.id,
        organization_id:  orgId,
        account_id:       accounts.building_id,
        debit_amount:     room.buildingValue,
        credit_amount:    0,
        description:      `${room.unitNumber} 건물`,
        property_id:      room.propertyId,
        contract_id:      null,
        line_order:       order++,
      })
    }
  }

  // 대변: 호실별 임대보증금 (임차인 있는 경우)
  if (accounts.deposit_id) {
    for (const room of savedRooms) {
      if (room.depositAmount > 0 && room.tenantName?.trim()) {
        lines.push({
          journal_entry_id: entry.id,
          organization_id:  orgId,
          account_id:       accounts.deposit_id,
          debit_amount:     0,
          credit_amount:    room.depositAmount,
          description:      `${room.unitNumber} 임대보증금 (${room.tenantName})`,
          property_id:      room.propertyId,
          contract_id:      room.contractId,
          line_order:       order++,
        })
      }
    }
  }

  // 대변: 대출금
  if (loanAmount > 0 && accounts.loan_id) {
    lines.push({
      journal_entry_id: entry.id,
      organization_id:  orgId,
      account_id:       accounts.loan_id,
      debit_amount:     0,
      credit_amount:    loanAmount,
      description:      '대출금',
      property_id:      null,
      contract_id:      null,
      line_order:       order++,
    })
  }

  // 대변: 자본금 (차변-대변 균형액)
  const totalDebit  = lines.reduce((s, l) => s + l.debit_amount,  0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)
  const capitalAmount = totalDebit - totalCredit

  if (capitalAmount > 0) {
    lines.push({
      journal_entry_id: entry.id,
      organization_id:  orgId,
      account_id:       accounts.capital_id,
      debit_amount:     0,
      credit_amount:    capitalAmount,
      description:      '개시자본금',
      property_id:      null,
      contract_id:      null,
      line_order:       order++,
    })
  } else if (capitalAmount < 0) {
    await supabase.from('journal_entries').delete().eq('id', entry.id)
    return NextResponse.json({ error: `분개 불균형: 자본금이 음수(${capitalAmount}원)입니다.` }, { status: 422 })
  }

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(lines)

  if (linesError) {
    await supabase.from('journal_entries').delete().eq('id', entry.id)
    return NextResponse.json({ error: `전표 명세 저장 실패: ${linesError.message}` }, { status: 500 })
  }

  return NextResponse.json({ journalEntryId: entry.id }, { status: 201 })
}
