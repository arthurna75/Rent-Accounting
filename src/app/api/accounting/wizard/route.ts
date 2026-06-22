import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFiscalYear } from '@/lib/accounting/journal-service'

interface RoomInput {
  propertyId?: string
  contractId?: string
  unitNumber: string
  exclusiveArea: number | null
  landShareRatio: number | null
  landValue: number
  buildingValue: number
  acquisitionDate: string
  tenantName: string | null
  depositAmount: number
  monthlyRent: number
  managementFee: number | null
  leaseStart: string | null
  leaseEnd: string | null
}

interface AccountsInput {
  land_id: string
  building_id: string
  deposit_id: string | null
  loan_id: string | null
  capital_id: string
}

interface WizardPayload {
  buildingName: string
  conversionDate: string
  rooms: RoomInput[]
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
  const body: WizardPayload = await req.json()
  const { buildingName, conversionDate, rooms, accounts, loanAmount } = body

  if (!buildingName || !conversionDate || !rooms?.length) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 422 })
  }

  // ── 1. 호실별 property upsert ───────────────────────────
  const propertyIds: Record<string, string> = {}  // unitNumber → property_id

  for (const room of rooms) {
    const propData = {
      organization_id: orgId,
      building_name:   buildingName,
      unit_number:     room.unitNumber,
      property_type:   '다세대' as const,
      rental_tax_type: '면세' as const,
      address_road:    buildingName,
      acquisition_date: room.acquisitionDate,
      acquisition_cost: room.landValue + room.buildingValue,
      land_value:       room.landValue || null,
      building_value:   room.buildingValue || null,
      land_share_ratio: room.landShareRatio ?? null,
      building_area:    room.exclusiveArea ?? null,
      useful_life:      40,
      depreciation_method: '정액법' as const,
      salvage_value:    0,
      is_active:        true,
    }

    if (room.propertyId) {
      const { error } = await supabase
        .from('properties')
        .update(propData)
        .eq('id', room.propertyId)
        .eq('organization_id', orgId)

      if (error) return NextResponse.json({ error: `호실 수정 실패(${room.unitNumber}): ${error.message}` }, { status: 500 })
      propertyIds[room.unitNumber] = room.propertyId
    } else {
      const { data: newProp, error } = await supabase
        .from('properties')
        .insert(propData)
        .select('id')
        .single()

      if (error || !newProp) return NextResponse.json({ error: `호실 등록 실패(${room.unitNumber}): ${error?.message}` }, { status: 500 })
      propertyIds[room.unitNumber] = newProp.id
    }
  }

  // ── 2. 계약 upsert ───────────────────────────────────────
  const contractIds: Record<string, string> = {}  // unitNumber → contract_id

  // 신규 계약 번호 생성용: 오늘 날짜 기준 count
  const today = conversionDate  // 전환기준일을 계약일로 사용
  const prefix = today.replace(/-/g, '')
  const { count: existingCount } = await supabase
    .from('lease_contracts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .like('contract_number', `${prefix}_%`)

  let seqCounter = (existingCount ?? 0) + 1

  for (const room of rooms) {
    const propId = propertyIds[room.unitNumber]
    if (!propId) continue

    if (room.tenantName && room.tenantName.trim()) {
      const contractType = room.monthlyRent > 0 ? '월세' as const : '전세' as const
      const contractData = {
        organization_id:        orgId,
        property_id:            propId,
        lessee_name:            room.tenantName.trim(),
        contract_type:          contractType,
        start_date:             room.leaseStart ?? conversionDate,
        end_date:               room.leaseEnd ?? conversionDate,
        deposit_amount:         room.depositAmount,
        monthly_rent:           room.monthlyRent,
        monthly_management_fee: room.managementFee ?? null,
        vat_included:           false,
        payment_due_day:        1,
        auto_renewal:           false,
        auto_journal_rent:      false,
        auto_journal_mgmt:      false,
        status:                 'active' as const,
      }

      if (room.contractId) {
        const { error } = await supabase
          .from('lease_contracts')
          .update(contractData)
          .eq('id', room.contractId)
          .eq('organization_id', orgId)

        if (error) return NextResponse.json({ error: `계약 수정 실패(${room.unitNumber}): ${error.message}` }, { status: 500 })
        contractIds[room.unitNumber] = room.contractId
      } else {
        const contractNumber = `${prefix}_${String(seqCounter).padStart(2, '0')}`
        seqCounter++

        const { data: newContract, error } = await supabase
          .from('lease_contracts')
          .insert({ ...contractData, contract_number: contractNumber })
          .select('id')
          .single()

        if (error || !newContract) return NextResponse.json({ error: `계약 등록 실패(${room.unitNumber}): ${error?.message}` }, { status: 500 })
        contractIds[room.unitNumber] = newContract.id
      }
    }
  }

  // ── 3. 개시분개 생성 ─────────────────────────────────────
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

  // 전표 헤더
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

  // 분개 라인 빌드 (account_id 직접 사용)
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
  for (const room of rooms) {
    if (room.landValue > 0 && propertyIds[room.unitNumber]) {
      lines.push({
        journal_entry_id: entry.id,
        organization_id:  orgId,
        account_id:       accounts.land_id,
        debit_amount:     room.landValue,
        credit_amount:    0,
        description:      `${room.unitNumber} 토지`,
        property_id:      propertyIds[room.unitNumber],
        contract_id:      null,
        line_order:       order++,
      })
    }
  }

  // 차변: 호실별 건물
  for (const room of rooms) {
    if (room.buildingValue > 0 && propertyIds[room.unitNumber]) {
      lines.push({
        journal_entry_id: entry.id,
        organization_id:  orgId,
        account_id:       accounts.building_id,
        debit_amount:     room.buildingValue,
        credit_amount:    0,
        description:      `${room.unitNumber} 건물`,
        property_id:      propertyIds[room.unitNumber],
        contract_id:      null,
        line_order:       order++,
      })
    }
  }

  // 대변: 호실별 임대보증금
  if (accounts.deposit_id) {
    for (const room of rooms) {
      if (room.depositAmount > 0 && room.tenantName?.trim() && propertyIds[room.unitNumber]) {
        lines.push({
          journal_entry_id: entry.id,
          organization_id:  orgId,
          account_id:       accounts.deposit_id,
          debit_amount:     0,
          credit_amount:    room.depositAmount,
          description:      `${room.unitNumber} 임대보증금 (${room.tenantName})`,
          property_id:      propertyIds[room.unitNumber],
          contract_id:      contractIds[room.unitNumber] ?? null,
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

  // 대변: 자본금 (균형액)
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
    // 불균형 — 헤더 롤백 후 에러
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
