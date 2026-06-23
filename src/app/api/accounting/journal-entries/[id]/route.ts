import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveJournalEntry, reverseJournalEntry } from '@/lib/accounting/journal-service'
import type { JournalEntryStatus } from '@/types/database'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

const LineSchema = z.object({
  account_code: z.string().min(1),
  debit_amount: z.number().min(0),
  credit_amount: z.number().min(0),
  description: z.string().optional().nullable(),
})

const UpdateSchema = z.object({
  action: z.literal('update'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  entry_type: z.enum(['일반','임대수익','보증금수령','보증금반환','감가상각','간주임대료','세금','관리비','비용지출']),
  vendor_id: z.string().uuid().optional().nullable(),
  evidence_type: z.enum(['현금영수증','세금계산서','영수증','기타','사업자용 카드']).optional().nullable(),
  attachment_urls: z.array(z.string()).optional().nullable(),
  lines: z.array(LineSchema).min(2),
})

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      *,
      lines:journal_entry_lines (
        *,
        account:chart_of_accounts!account_id (code, name, account_type)
      ),
      vendor:vendors!vendor_id (id, name, business_number)
    `)
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
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

  if (body.action === 'approve') {
    try {
      await approveJournalEntry(supabase, id, user.id)
      return NextResponse.json({ success: true })
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 })
    }
  }

  if (body.action === 'update') {
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    // 조직 소속 + 역분개 여부 확인
    const { data: existing, error: fetchErr } = await supabase
      .from('journal_entries')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (fetchErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if ((existing.status as JournalEntryStatus) === 'reversed') {
      return NextResponse.json({ error: '역분개된 전표는 수정할 수 없습니다.' }, { status: 409 })
    }

    // 대차 밸런스 검증
    const totalDebit = parsed.data.lines.reduce((s, l) => s + l.debit_amount, 0)
    const totalCredit = parsed.data.lines.reduce((s, l) => s + l.credit_amount, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: `대차 불일치: 차변 ${totalDebit} ≠ 대변 ${totalCredit}` }, { status: 400 })
    }

    // 계정과목 코드 → ID 매핑
    const codes = [...new Set(parsed.data.lines.map(l => l.account_code))]
    const { data: accountRows, error: acctErr } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .eq('organization_id', profile.organization_id)
      .in('code', codes)

    if (acctErr) return NextResponse.json({ error: acctErr.message }, { status: 500 })

    const accountMap: Record<string, string> = {}
    for (const row of accountRows ?? []) {
      accountMap[row.code] = row.id
    }

    const missing = codes.find(c => !accountMap[c])
    if (missing) {
      return NextResponse.json({ error: `계정과목 코드 ${missing}를 찾을 수 없습니다.` }, { status: 400 })
    }

    // 헤더 업데이트
    const { error: updateErr } = await supabase
      .from('journal_entries')
      .update({
        entry_date: parsed.data.entry_date,
        description: parsed.data.description,
        entry_type: parsed.data.entry_type,
        vendor_id: parsed.data.vendor_id ?? null,
        evidence_type: parsed.data.evidence_type ?? null,
        attachment_urls: parsed.data.attachment_urls ?? null,
      })
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // 기존 명세 삭제
    await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', id)

    // 새 명세 삽입
    const lineInserts = parsed.data.lines.map((l, idx) => ({
      journal_entry_id: id,
      organization_id: profile.organization_id,
      account_id: accountMap[l.account_code],
      debit_amount: l.debit_amount,
      credit_amount: l.credit_amount,
      description: l.description ?? null,
      line_order: idx,
    }))

    const { error: linesErr } = await supabase
      .from('journal_entry_lines')
      .insert(lineInserts)

    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  }

  if (body.action === 'update_attachments') {
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const urls = Array.isArray(body.attachment_urls) ? body.attachment_urls : []
    const { error: updateErr } = await supabase
      .from('journal_entries')
      .update({ attachment_urls: urls })
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
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

  if (body.action !== 'reverse') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const reversalDate: string = body.reversal_date
  if (!reversalDate || !/^\d{4}-\d{2}-\d{2}$/.test(reversalDate)) {
    return NextResponse.json({ error: 'reversal_date is required (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const reversalEntry = await reverseJournalEntry(
      supabase,
      profile.organization_id,
      id,
      reversalDate,
      user.id,
    )
    return NextResponse.json({ data: reversalEntry }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 조직 소속 + 역분개 여부 확인
  const { data: entry, error: fetchError } = await supabase
    .from('journal_entries')
    .select('id, status')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (fetchError || !entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if ((entry.status as JournalEntryStatus) === 'reversed') {
    return NextResponse.json({ error: '역분개된 전표는 삭제할 수 없습니다.' }, { status: 409 })
  }

  // 명세 먼저 삭제
  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .delete()
    .eq('journal_entry_id', id)

  if (linesError) {
    return NextResponse.json({ error: linesError.message }, { status: 500 })
  }

  // 헤더 삭제
  const { error: entryError } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
