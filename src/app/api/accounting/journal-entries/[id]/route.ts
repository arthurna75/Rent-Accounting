import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveJournalEntry, reverseJournalEntry } from '@/lib/accounting/journal-service'
import type { JournalEntryStatus } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

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
      )
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

  if (body.action !== 'approve') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  try {
    await approveJournalEntry(supabase, id, user.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
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

  // draft 상태인지 확인 (org 소속 검증 포함)
  const { data: entry, error: fetchError } = await supabase
    .from('journal_entries')
    .select('id, status')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (fetchError || !entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if ((entry.status as JournalEntryStatus) !== 'draft') {
    return NextResponse.json({ error: 'draft 상태의 전표만 삭제할 수 있습니다.' }, { status: 409 })
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
