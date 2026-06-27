import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postJournalEntry } from '@/lib/accounting/journal-service'
import type { JournalEntryStatus, JournalEntryType } from '@/types/database'
import { z } from 'zod'

const LineSchema = z.object({
  account_code: z.string().min(1),
  debit_amount: z.number().min(0),
  credit_amount: z.number().min(0),
  description: z.string().optional(),
  property_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
})

const JournalEntrySchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  entry_type: z.enum(['일반','임대수익','보증금수령','보증금반환','감가상각','간주임대료','세금','관리비','비용지출']),
  vendor_id: z.string().uuid().optional().nullable(),
  evidence_type: z.enum(['현금영수증','세금계산서','영수증','사업자용 카드','기타']).optional().nullable(),
  nts_approval_number: z.string().optional().nullable(),
  attachment_urls: z.array(z.string().url()).optional().nullable(),
  reference_id: z.string().uuid().optional(),
  reference_type: z.string().optional(),
  lines: z.array(LineSchema).min(2),
  auto_post: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const entryType = searchParams.get('entry_type')
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  const vendorId = searchParams.get('vendor_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  let query = supabase
    .from('journal_entries')
    .select(`
      *,
      lines:journal_entry_lines (
        *,
        account:chart_of_accounts!account_id (code, name, account_type)
      )
    `, { count: 'exact' })
    .order('entry_date', { ascending: false })
    .order('entry_number', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status as JournalEntryStatus)
  if (entryType) query = query.eq('entry_type', entryType as JournalEntryType)
  if (fromDate) query = query.gte('entry_date', fromDate)
  if (toDate) query = query.lte('entry_date', toDate)
  if (vendorId) query = query.eq('vendor_id', vendorId)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count ?? 0 },
  })
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

  const body = await req.json()
  const parsed = JournalEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const entry = await postJournalEntry(
      supabase,
      profile.organization_id,
      parsed.data,
      user.id,
      parsed.data.auto_post,
    )
    // vendor_id / evidence_type / nts_approval_number / attachment_urls 는 postJournalEntry 외부 컬럼이므로 별도 UPDATE
    if (parsed.data.vendor_id || parsed.data.evidence_type || parsed.data.attachment_urls || parsed.data.nts_approval_number) {
      await supabase
        .from('journal_entries')
        .update({
          vendor_id: parsed.data.vendor_id ?? null,
          evidence_type: parsed.data.evidence_type ?? null,
          nts_approval_number: parsed.data.nts_approval_number ?? null,
          attachment_urls: parsed.data.attachment_urls ?? null,
        })
        .eq('id', entry.id)
    }
    return NextResponse.json({ data: entry }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
