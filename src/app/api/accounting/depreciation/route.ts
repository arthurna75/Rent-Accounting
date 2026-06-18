/**
 * 감가상각 자동 처리 API
 * POST /api/accounting/depreciation
 *   body: { year: number, month: number, property_ids?: string[] }
 * GET  /api/accounting/depreciation?year=2026&property_id=xxx
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateMonthlyDepreciation } from '@/lib/accounting/depreciation'
import { createDepreciationJournal } from '@/lib/accounting/double-entry'
import { postJournalEntry } from '@/lib/accounting/journal-service'
import { z } from 'zod'

const RunSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  property_ids: z.array(z.string().uuid()).optional(),
})

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

  const body = await req.json()
  const parsed = RunSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { year, month, property_ids } = parsed.data

  // 처리 대상 부동산 조회
  let propQuery = supabase
    .from('properties')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .not('building_value', 'is', null)
    .gt('building_value', 0)

  if (property_ids?.length) {
    propQuery = propQuery.in('id', property_ids)
  }

  const { data: properties, error: propError } = await propQuery
  if (propError) return NextResponse.json({ error: propError.message }, { status: 500 })

  const results: Array<{ property_id: string; property_name: string; amount: number; status: string }> = []

  for (const property of properties ?? []) {
    // 이미 처리된 월인지 확인
    const { data: existing } = await supabase
      .from('depreciation_schedules')
      .select('id, is_processed')
      .eq('property_id', property.id)
      .eq('fiscal_year', year)
      .eq('period_month', month)
      .single()

    if (existing?.is_processed) {
      results.push({ property_id: property.id, property_name: property.name, amount: 0, status: 'already_processed' })
      continue
    }

    // 누계 상각액 조회
    const { data: accData } = await supabase
      .from('depreciation_schedules')
      .select('accumulated_depreciation')
      .eq('property_id', property.id)
      .eq('is_processed', true)
      .order('fiscal_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(1)
      .single()

    const accumulated = accData?.accumulated_depreciation ?? 0

    const depResult = calculateMonthlyDepreciation(property, year, month, accumulated)
    if (!depResult || depResult.depreciation_amount <= 0) {
      results.push({ property_id: property.id, property_name: property.name, amount: 0, status: 'no_depreciation' })
      continue
    }

    // 분개 생성
    const journalInput = createDepreciationJournal({
      property,
      amount: depResult.depreciation_amount,
      entryDate: `${year}-${String(month).padStart(2, '0')}-28`,
      period: `${year}년 ${month}월`,
    })

    try {
      const entry = await postJournalEntry(supabase, profile.organization_id, journalInput, user.id, true)

      // 스케줄 저장
      if (existing) {
        await supabase
          .from('depreciation_schedules')
          .update({ ...depResult, journal_entry_id: entry.id, is_processed: true, processed_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabase.from('depreciation_schedules').insert({
          organization_id: profile.organization_id,
          property_id: property.id,
          journal_entry_id: entry.id,
          is_processed: true,
          processed_at: new Date().toISOString(),
          ...depResult,
        })
      }

      results.push({ property_id: property.id, property_name: property.name, amount: depResult.depreciation_amount, status: 'processed' })
    } catch (e) {
      results.push({ property_id: property.id, property_name: property.name, amount: 0, status: `error: ${(e as Error).message}` })
    }
  }

  return NextResponse.json({ data: results })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const propertyId = searchParams.get('property_id')

  let query = supabase
    .from('depreciation_schedules')
    .select('*, property:properties!property_id(name, address_road)')
    .order('fiscal_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (year) query = query.eq('fiscal_year', parseInt(year))
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
