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
    q?: string          // 적요 LIKE 검색
    type?: string       // entry_type 필터
    account_type?: string // 계정과목 유형 필터 (자산/부채/자본/수익/비용)
    account_id?: string   // 특정 계정과목 ID
    vendor_id?: string    // 거래처 ID
    contract_id?: string  // 적용호수(계약) ID
    unverified?: string // '1' = 증빙 미확인만 (세금계산서·현금영수증 && nts_verified=false)
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
  const unverifiedOnly = params.unverified === '1'

  // ── 필터 드롭다운용 데이터 조회 ───────────────────────────────
  const [{ data: vendors }, { data: contractsRaw }, { data: accounts }] = await Promise.all([
    supabase
      .from('vendors')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('lease_contracts')
      .select(`id, lessee_name, property:properties!property_id (building_name, unit_number)`)
      .eq('organization_id', orgId)
      .order('lessee_name'),
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('code'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (contractsRaw ?? []).map((c: any) => ({
    id: c.id as string,
    label: c.property
      ? `${c.property.building_name} ${c.property.unit_number} (${c.lessee_name})`
      : c.lessee_name as string,
  }))

  // ── 계정과목 2-step 필터 ─────────────────────────────────────
  let accountEntryIds: string[] | null = null

  if (params.account_id) {
    // 특정 계정 ID가 있으면 그 계정을 사용한 entry 조회
    const { data: lineRows } = await supabase
      .from('journal_entry_lines')
      .select('journal_entry_id')
      .eq('account_id', params.account_id)
    accountEntryIds = [...new Set((lineRows ?? []).map(l => l.journal_entry_id as string))]
    if (accountEntryIds.length === 0) accountEntryIds = []
  } else if (params.account_type) {
    // 유형만 있으면 해당 유형의 계정들이 포함된 entry 조회
    const { data: acctRows } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', orgId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('account_type', params.account_type as any)

    const acctIds = (acctRows ?? []).map(a => a.id)
    if (acctIds.length > 0) {
      const { data: lineRows } = await supabase
        .from('journal_entry_lines')
        .select('journal_entry_id')
        .in('account_id', acctIds)
      accountEntryIds = [...new Set((lineRows ?? []).map(l => l.journal_entry_id as string))]
    } else {
      accountEntryIds = []
    }
  }

  // ── 적용호수(계약) 2-step 필터 ───────────────────────────────
  let contractEntryIds: string[] | null = null
  if (params.contract_id) {
    const { data: lineRows } = await supabase
      .from('journal_entry_lines')
      .select('journal_entry_id')
      .eq('contract_id', params.contract_id)
    contractEntryIds = [...new Set((lineRows ?? []).map(l => l.journal_entry_id as string))]
    if (contractEntryIds.length === 0) contractEntryIds = []
  }

  // ── 메인 쿼리 ─────────────────────────────────────────────────
  let query = supabase
    .from('journal_entries')
    .select(`
      id, entry_number, entry_date, description, entry_type, status,
      evidence_type, nts_verified,
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
    .eq('organization_id', orgId)
    .order('entry_date', { ascending: false })
    .order('entry_number', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.status)  query = query.eq('status', params.status as JournalEntryStatus)
  if (params.from)    query = query.gte('entry_date', params.from)
  if (params.to)      query = query.lte('entry_date', params.to)
  if (params.q?.trim())    query = query.ilike('description', `%${params.q.trim()}%`)
  if (params.type?.trim()) query = query.eq('entry_type', params.type.trim() as import('@/types/database').JournalEntryType)
  if (params.vendor_id)    query = query.eq('vendor_id', params.vendor_id)

  // 계정과목 필터 적용
  if (accountEntryIds !== null) {
    if (accountEntryIds.length === 0) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      query = query.in('id', accountEntryIds)
    }
  }

  // 적용호수 필터 적용 (계정과목 필터와 AND 조건)
  if (contractEntryIds !== null) {
    if (contractEntryIds.length === 0) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      query = query.in('id', contractEntryIds)
    }
  }

  // 증빙 미확인 필터
  if (unverifiedOnly) {
    query = query.in('evidence_type', ['세금계산서', '현금영수증']).eq('nts_verified', false)
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
        filterAccountType={params.account_type}
        filterAccountId={params.account_id}
        filterVendorId={params.vendor_id}
        filterContractId={params.contract_id}
        filterUnverifiedOnly={unverifiedOnly}
        vendors={vendors ?? []}
        contracts={contracts}
        accounts={accounts ?? []}
      />
    </div>
  )
}
