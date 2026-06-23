import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postJournalEntry } from '@/lib/accounting/journal-service'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('lease_contracts')
    .select(`
      *,
      property:properties!property_id (*),
      deposit_transactions (*),
      rent_transactions (*)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowedFields = [
    'property_id', 'lessee_name', 'lessee_phone', 'lessee_email', 'lessee_id_number',
    'contract_type', 'contract_date', 'start_date', 'end_date',
    'deposit_amount', 'monthly_rent', 'monthly_management_fee',
    'payment_due_day', 'vat_included',
    'notes', 'special_terms', 'auto_renewal', 'attachment_urls',
    'broker_vendor_id', 'broker_fee', 'auto_journal_broker', 'auto_journal_deposit',
  ]
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowedFields.includes(k))
  )

  const { data, error } = await supabase
    .from('lease_contracts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const depositRefund = searchParams.get('deposit_refund') === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 계약 정보 조회 (보증금, 조직ID, 임차인명)
  const { data: contract, error: fetchError } = await supabase
    .from('lease_contracts')
    .select('id, organization_id, deposit_amount, lessee_name')
    .eq('id', id)
    .single()

  if (fetchError || !contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  // soft delete (status → terminated)
  const { data, error } = await supabase
    .from('lease_contracts')
    .update({ status: 'terminated', termination_date: today })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 보증금 환불 분개 (차: 임대보증금/310, 대: 보통예금/102)
  if (depositRefund && contract.deposit_amount > 0) {
    try {
      await postJournalEntry(
        supabase,
        contract.organization_id,
        {
          entry_date:     today,
          entry_type:     '보증금반환',
          description:    `${contract.lessee_name} 보증금 반환`,
          reference_id:   id,
          reference_type: 'lease_contracts',
          lines: [
            { account_code: '310', debit_amount: contract.deposit_amount, credit_amount: 0, contract_id: id },
            { account_code: '102', debit_amount: 0, credit_amount: contract.deposit_amount, contract_id: id },
          ],
        },
        user.id,
        false,
      )
    } catch (e) {
      console.error('[deposit-refund-journal]', (e as Error).message)
    }
  }

  return NextResponse.json({ data })
}
