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
  entry_type: z.enum(['일반','임대수익','보증금수령','보증금반환','감가상각','간주임대료','세금','관리비']),
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
    return NextResponse.json({ data: entry }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
