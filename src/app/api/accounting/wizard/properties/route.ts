import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

interface PropertiesPayload {
  buildingName: string
  conversionDate: string
  rooms: RoomInput[]
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
  const body: PropertiesPayload = await req.json()
  const { buildingName, conversionDate, rooms } = body

  if (!buildingName || !conversionDate || !rooms?.length) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 422 })
  }

  const result: { unitNumber: string; propertyId: string; contractId: string | null }[] = []

  // ── 1. 호실별 property upsert ───────────────────────────
  const propertyIds: Record<string, string> = {}

  for (const room of rooms) {
    const propData = {
      organization_id:     orgId,
      building_name:       buildingName,
      unit_number:         room.unitNumber,
      property_type:       '다세대' as const,
      rental_tax_type:     '면세' as const,
      address_road:        buildingName,
      acquisition_date:    room.acquisitionDate,
      acquisition_cost:    room.landValue + room.buildingValue,
      land_value:          room.landValue || null,
      building_value:      room.buildingValue || null,
      land_share_ratio:    room.landShareRatio ?? null,
      building_area:       room.exclusiveArea ?? null,
      useful_life:         40,
      depreciation_method: '정액법' as const,
      salvage_value:       0,
      is_active:           true,
    }

    if (room.propertyId) {
      // 기존 호실 업데이트
      const { error } = await supabase
        .from('properties')
        .update(propData)
        .eq('id', room.propertyId)
        .eq('organization_id', orgId)

      if (error) return NextResponse.json({ error: `호실 수정 실패(${room.unitNumber}): ${error.message}` }, { status: 500 })
      propertyIds[room.unitNumber] = room.propertyId
    } else {
      // 신규 호실 등록
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
  const contractIds: Record<string, string> = {}

  // 신규 계약 번호 채번용 prefix (전환기준일 기준)
  const prefix = conversionDate.replace(/-/g, '')
  const { count: existingCount } = await supabase
    .from('lease_contracts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .like('contract_number', `${prefix}_%`)

  let seqCounter = (existingCount ?? 0) + 1

  for (const room of rooms) {
    const propId = propertyIds[room.unitNumber]
    if (!propId) continue

    if (room.tenantName?.trim()) {
      // 임차인 있음: contract 생성 또는 업데이트
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
        // 기존 계약 업데이트
        const { error } = await supabase
          .from('lease_contracts')
          .update(contractData)
          .eq('id', room.contractId)
          .eq('organization_id', orgId)

        if (error) return NextResponse.json({ error: `계약 수정 실패(${room.unitNumber}): ${error.message}` }, { status: 500 })
        contractIds[room.unitNumber] = room.contractId
      } else {
        // 공실 → 임차인 등록: 신규 계약 생성
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
    // 공실(tenantName 없음): property만 저장, contract 없음

    result.push({
      unitNumber:  room.unitNumber,
      propertyId:  propertyIds[room.unitNumber],
      contractId:  contractIds[room.unitNumber] ?? null,
    })
  }

  return NextResponse.json({ rooms: result }, { status: 200 })
}
