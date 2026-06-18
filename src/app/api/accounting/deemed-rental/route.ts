/**
 * 간주임대료 계산 및 저장 API
 * POST /api/accounting/deemed-rental  { year: number }
 * GET  /api/accounting/deemed-rental?year=2026
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateDeemedRental, calculateRentalDays } from '@/lib/accounting/deemed-rental'
import { createDeemedRentalJournal } from '@/lib/accounting/double-entry'
import { postJournalEntry } from '@/lib/accounting/journal-service'
import { z } from 'zod'

const RunSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  create_journal: z.boolean().default(false),
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

  const { year, create_journal } = parsed.data

  // 기준이율 조회
  const { data: rateData } = await supabase
    .from('standard_interest_rates')
    .select('rate')
    .eq('effective_year', year)
    .single()

  const standardRate = rateData?.rate ?? 0.029

  // 해당 연도에 활성 계약 조회 (보증금 있는 계약)
  const { data: contracts, error: contractError } = await supabase
    .from('lease_contracts')
    .select(`
      id, lessee_name, deposit_amount, start_date, end_date, contract_type,
      property:properties!property_id (id, name, rental_tax_type)
    `)
    .eq('organization_id', profile.organization_id)
    .in('status', ['active', 'expired'])
    .gt('deposit_amount', 0)
    .lte('start_date', `${year}-12-31`)
    .gte('end_date', `${year}-01-01`)

  if (contractError) return NextResponse.json({ error: contractError.message }, { status: 500 })

  const results = []

  for (const contract of contracts ?? []) {
    const prop = contract.property as { id: string; name: string; rental_tax_type: '과세' | '면세' } | null
    const isResidential = prop?.rental_tax_type === '면세'

    const rentalDays = calculateRentalDays(
      new Date(contract.start_date),
      new Date(contract.end_date),
      year,
    )

    if (rentalDays <= 0) continue

    const result = calculateDeemedRental({
      depositAmount: contract.deposit_amount,
      standardRate,
      rentalDays,
      isResidential,
    })

    let journalEntryId: string | null = null

    if (create_journal && result.taxableDeemedIncome > 0) {
      const journalInput = createDeemedRentalJournal({
        contract: (contract as unknown) as Parameters<typeof createDeemedRentalJournal>[0]['contract'],
        deemedIncome: result.taxableDeemedIncome,
        entryDate: `${year}-12-31`,
        fiscalYear: year,
      })

      try {
        const entry = await postJournalEntry(supabase, profile.organization_id, journalInput, user.id, true)
        journalEntryId = entry.id
      } catch {}
    }

    // 계산 결과 저장
    const { data: saved } = await supabase
      .from('deemed_rental_calculations')
      .upsert({
        organization_id: profile.organization_id,
        contract_id: contract.id,
        fiscal_year: year,
        calculation_period_start: `${year}-01-01`,
        calculation_period_end: `${year}-12-31`,
        deposit_amount: contract.deposit_amount,
        standard_rate: standardRate,
        rental_days: rentalDays,
        deemed_income: result.grossDeemedIncome,
        taxable_deemed_income: result.taxableDeemedIncome,
        journal_entry_id: journalEntryId,
        is_processed: create_journal,
      })
      .select()
      .single()

    results.push({
      contract_id: contract.id,
      lessee_name: contract.lessee_name,
      property_name: prop?.name,
      is_residential: isResidential,
      rental_days: rentalDays,
      deposit_amount: contract.deposit_amount,
      deemed_income: result.grossDeemedIncome,
      taxable_deemed_income: result.taxableDeemedIncome,
      calculation_note: result.calculationNote,
    })
  }

  const totalTaxable = results.reduce((s, r) => s + r.taxable_deemed_income, 0)

  return NextResponse.json({
    data: {
      year,
      standard_rate: standardRate,
      contracts: results,
      summary: { total_taxable_deemed_income: totalTaxable },
    },
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')

  let query = supabase
    .from('deemed_rental_calculations')
    .select(`
      *,
      contract:lease_contracts!contract_id (lessee_name, deposit_amount,
        property:properties!property_id (name))
    `)
    .order('fiscal_year', { ascending: false })

  if (year) query = query.eq('fiscal_year', parseInt(year))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
