import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postJournalEntry } from '@/lib/accounting/journal-service'
import type { ContractStatus } from '@/types/database'
import { z } from 'zod'

const ContractSchema = z.object({
  property_id:              z.string().uuid(),
  contract_number:          z.string().min(1).max(50),
  contract_date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lessee_name:              z.string().min(1).max(100),
  lessee_id_number:         z.string().optional(),
  lessee_phone:             z.string().optional(),
  lessee_email:             z.string().email().optional(),
  contract_type:            z.enum(['월세', '전세', '반전세']),
  start_date:               z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:                 z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deposit_amount:           z.number().min(0),
  monthly_rent:             z.number().min(0),
  monthly_management_fee:   z.number().min(0).optional(),
  vat_included:             z.boolean().default(true),
  payment_due_day:          z.number().int().min(1).max(31).default(1),
  auto_renewal:             z.boolean().default(false),
  auto_journal_rent:        z.boolean().default(false),
  auto_journal_mgmt:        z.boolean().default(false),
  special_terms:            z.string().optional(),
  notes:                    z.string().optional(),
  attachment_urls:          z.array(z.string().url()).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const propertyId = searchParams.get('property_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('lease_contracts')
    .select(`
      *,
      property:properties!property_id (
        id, name, address_road, property_type, rental_tax_type
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status as ContractStatus)
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = ContractSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'accountant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { auto_journal_rent, auto_journal_mgmt, ...contractData } = parsed.data

  const { data, error } = await supabase
    .from('lease_contracts')
    .insert({
      ...contractData,
      auto_journal_rent,
      auto_journal_mgmt,
      organization_id: profile.organization_id,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── 수입 자동 분개 ────────────────────────────────────────
  const entryDate = contractData.contract_date ?? contractData.start_date

  if (auto_journal_rent && contractData.monthly_rent > 0) {
    try {
      await postJournalEntry(
        supabase,
        profile.organization_id,
        {
          entry_date:     entryDate,
          entry_type:     '임대수익',
          description:    `${contractData.lessee_name} 월세`,
          reference_id:   data.id,
          reference_type: 'lease_contracts',
          lines: [
            { account_code: '102', debit_amount: contractData.monthly_rent, credit_amount: 0, contract_id: data.id },
            { account_code: '510', debit_amount: 0, credit_amount: contractData.monthly_rent, contract_id: data.id },
          ],
        },
        user.id,
        false,
      )
    } catch (e) {
      console.error('[auto-journal-rent]', (e as Error).message)
    }
  }

  if (auto_journal_mgmt && contractData.monthly_management_fee && contractData.monthly_management_fee > 0) {
    try {
      await postJournalEntry(
        supabase,
        profile.organization_id,
        {
          entry_date:     entryDate,
          entry_type:     '관리비',
          description:    `${contractData.lessee_name} 관리비`,
          reference_id:   data.id,
          reference_type: 'lease_contracts',
          lines: [
            { account_code: '102', debit_amount: contractData.monthly_management_fee, credit_amount: 0, contract_id: data.id },
            { account_code: '520', debit_amount: 0, credit_amount: contractData.monthly_management_fee, contract_id: data.id },
          ],
        },
        user.id,
        false,
      )
    } catch (e) {
      console.error('[auto-journal-mgmt]', (e as Error).message)
    }
  }

  return NextResponse.json({ data }, { status: 201 })
}
