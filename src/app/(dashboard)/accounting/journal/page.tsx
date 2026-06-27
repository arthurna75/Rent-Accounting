import { createClient } from '@/lib/supabase/server'
import type { JournalEntryStatus } from '@/types/database'
import { JournalLedgerTable } from '@/components/accounting/JournalLedgerTable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { SampleJournal } from '@/components/sample/SampleJournal'

interface PageProps {
  searchParams: Promise<{
    status?: string
    from?: string
    to?: string
    page?: string
    q?: string       // 적요 LIKE 검색
    type?: string    // entry_type 필터
    account?: string // 계정과목 코드/명 검색 (2-step)
  }>
}

export default async function JournalPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SampleJournal isGuest />

  const { data: profile } = await supabase
    .from('user_profiles').select('organization_id').eq('id', user.id).single()

  const { count: propCount } = await supabase
    .from('properties').select('id', { count: 'exact', head: true })
    .eq('organization_id', profile!.organization_id)
  if ((propCount ?? 0) === 0) return <SampleJournal isGuest={false} />

  const orgId = profile!.organization_id
  const page  = parseInt(params.page ?? '1')
  const limit = 30
  const offset = (page - 1) * limit

  // ── 계정과목 2-step 필터 ─────────────────────────────────────
  let accountEntryIds: string[] | null = null
  if (params.account?.trim()) {
    const keyword = params.account.trim()
    const { data: acctRows } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', orgId)
      .or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%`)

    const acctIds = (acctRows ?? []).map(a => a.id)
    if (acctIds.length > 0) {
      const { data: lineRows } = await supabase
        .from('journal_entry_lines')
        .select('journal_entry_id')
        .in('account_id', acctIds)
      accountEntryIds = [...new Set((lineRows ?? []).map(l => l.journal_entry_id as string))]
    } else {
      accountEntryIds = [] // 매칭 계정 없음 → 결과 없음
    }
  }

  // ── 메인 쿼리 ─────────────────────────────────────────────────
  let query = supabase
    .from('journal_entries')
    .select(`
      id, entry_number, entry_date, description, entry_type, status,
      vendor:vendors!vendor_id (name),
      lines:journal_entry_lines (
        debit_amount, credit_amount,
        account:chart_of_accounts!account_id (code, name),
        contract:lease_contracts!contract_id (
          lessee_name,
          property:properties!property_id (building_name, unit_number)
        )
      )
    `, { count: 'exact' })
    .eq('organization_id', orgId)          // Task 2: 위저드 전표 포함 보장
    .order('entry_date', { ascending: false })
    .order('entry_number', { ascending: false })
    .range(offset, offset + limit - 1)

  // 기존 필터
  if (params.status)  query = query.eq('status', params.status as JournalEntryStatus)
  if (params.from)    query = query.gte('entry_date', params.from)
  if (params.to)      query = query.lte('entry_date', params.to)

  // 신규 필터 (Task 1)
  if (params.q?.trim())    query = query.ilike('description', `%${params.q.trim()}%`)
  if (params.type?.trim()) query = query.eq('entry_type', params.type.trim() as import('@/types/database').JournalEntryType)

  if (accountEntryIds !== null) {
    if (accountEntryIds.length === 0) {
      // 결과 없도록 강제 (UUID 형식 더미)
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      query = query.in('id', accountEntryIds)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawEntries, count } = await query as any
  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">분개장</h2>
        <Link href="/accounting/journal/new">
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="w-4 h-4" />
            전표 등록
          </Button>
        </Link>
      </div>

      <JournalLedgerTable
        entries={rawEntries ?? []}
        page={page}
        totalPages={totalPages}
        total={count ?? 0}
        filterStatus={params.status}
        filterFrom={params.from}
        filterTo={params.to}
        filterQ={params.q}
        filterType={params.type}
        filterAccount={params.account}
      />
    </div>
  )
}
