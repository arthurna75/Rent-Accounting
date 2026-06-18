/**
 * 분개 서비스 — Supabase 연동 분개 저장/조회/승인
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, JournalEntry, JournalEntryLine, FiscalYear, ChartOfAccount } from '@/types/database'
import { assertBalance, type JournalEntryInput } from './double-entry'

type Client = SupabaseClient<Database>

// ── 회계연도 조회 ─────────────────────────────────────────

export async function getFiscalYear(
  supabase: Client,
  organizationId: string,
  year: number,
): Promise<FiscalYear> {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('year', year)
    .single()

  if (error || !data) {
    throw new Error(`회계연도 ${year}년을 찾을 수 없습니다.`)
  }

  if (data.is_closed) {
    throw new Error(`회계연도 ${year}년은 마감되어 수정할 수 없습니다.`)
  }

  return data
}

// ── 계정과목 코드로 ID 조회 ───────────────────────────────

export async function getAccountByCode(
  supabase: Client,
  organizationId: string,
  code: string,
): Promise<ChartOfAccount> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('code', code)
    .single()

  if (error || !data) {
    throw new Error(`계정과목 코드 ${code}를 찾을 수 없습니다.`)
  }

  return data
}

// ── 분개 저장 ─────────────────────────────────────────────

export async function postJournalEntry(
  supabase: Client,
  organizationId: string,
  input: JournalEntryInput,
  createdBy: string,
  autoPost = false,
): Promise<JournalEntry> {
  // 밸런스 검증
  assertBalance(input.lines)

  const entryYear = new Date(input.entry_date).getFullYear()
  const fiscalYear = await getFiscalYear(supabase, organizationId, entryYear)

  // 전표번호 채번
  const { data: entryNumberData, error: seqError } = await supabase
    .rpc('next_entry_number', { p_org_id: organizationId, p_year: entryYear })

  if (seqError || !entryNumberData) {
    throw new Error('전표번호 채번 실패')
  }

  // 계정과목 코드 → ID 매핑
  const accountCodes = [...new Set(input.lines.map(l => l.account_code))]
  const accountMap: Record<string, string> = {}

  for (const code of accountCodes) {
    const account = await getAccountByCode(supabase, organizationId, code)
    accountMap[code] = account.id
  }

  // 전표 헤더 INSERT
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      organization_id: organizationId,
      fiscal_year_id: fiscalYear.id,
      entry_number: entryNumberData,
      entry_date: input.entry_date,
      description: input.description,
      entry_type: input.entry_type,
      reference_id: input.reference_id ?? null,
      reference_type: input.reference_type ?? null,
      status: autoPost ? 'posted' : 'draft',
      created_by: createdBy,
    })
    .select()
    .single()

  if (entryError || !entry) {
    throw new Error(`전표 저장 실패: ${entryError?.message}`)
  }

  // 전표 명세 INSERT
  const lineInserts = input.lines.map((line, idx) => ({
    journal_entry_id: entry.id,
    organization_id: organizationId,
    account_id: accountMap[line.account_code],
    debit_amount: line.debit_amount,
    credit_amount: line.credit_amount,
    description: line.description ?? null,
    property_id: line.property_id ?? null,
    contract_id: line.contract_id ?? null,
    line_order: idx,
  }))

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(lineInserts)

  if (linesError) {
    // 롤백: 헤더 삭제
    await supabase.from('journal_entries').delete().eq('id', entry.id)
    throw new Error(`전표 명세 저장 실패: ${linesError.message}`)
  }

  return entry
}

// ── 분개 승인 (draft → posted) ───────────────────────────

export async function approveJournalEntry(
  supabase: Client,
  entryId: string,
  approvedBy: string,
): Promise<void> {
  // 밸런스 재검증 (DB 레벨에서도 트리거로 체크하지만 이중 검증)
  const { data: lines } = await supabase
    .from('journal_entry_lines')
    .select('debit_amount, credit_amount')
    .eq('journal_entry_id', entryId)

  if (!lines) throw new Error('전표 명세를 찾을 수 없습니다.')

  const totalDebit = lines.reduce((s, l) => s + l.debit_amount, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`복식회계 불균형: 차변 ${totalDebit} ≠ 대변 ${totalCredit}`)
  }

  const { error } = await supabase
    .from('journal_entries')
    .update({
      status: 'posted',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('status', 'draft')

  if (error) throw new Error(`승인 실패: ${error.message}`)
}

// ── 역분개 (Reversal) ─────────────────────────────────────

export async function reverseJournalEntry(
  supabase: Client,
  organizationId: string,
  originalEntryId: string,
  reversalDate: string,
  createdBy: string,
): Promise<JournalEntry> {
  const { data: original, error } = await supabase
    .from('journal_entries')
    .select('*, lines:journal_entry_lines(*)')
    .eq('id', originalEntryId)
    .single()

  if (error || !original) throw new Error('원전표를 찾을 수 없습니다.')
  if (original.status !== 'posted') throw new Error('승인된 전표만 역분개할 수 있습니다.')
  if (original.is_reversed) throw new Error('이미 역분개된 전표입니다.')

  const reversalLines: JournalEntryInput['lines'] = (original.lines ?? []).map((l: JournalEntryLine) => ({
    account_code: '',                    // 아래서 account_id 직접 사용
    debit_amount: l.credit_amount,       // 차변↔대변 전환
    credit_amount: l.debit_amount,
    description: l.description ?? undefined,
    property_id: l.property_id ?? undefined,
    contract_id: l.contract_id ?? undefined,
  }))

  const entryYear = new Date(reversalDate).getFullYear()
  const fiscalYear = await getFiscalYear(supabase, organizationId, entryYear)

  const { data: entryNumber } = await supabase
    .rpc('next_entry_number', { p_org_id: organizationId, p_year: entryYear })

  const { data: reversalEntry, error: revError } = await supabase
    .from('journal_entries')
    .insert({
      organization_id: organizationId,
      fiscal_year_id: fiscalYear.id,
      entry_number: entryNumber ?? '',
      entry_date: reversalDate,
      description: `[역분개] ${original.description}`,
      entry_type: original.entry_type,
      reference_id: originalEntryId,
      reference_type: 'journal_entries',
      status: 'posted',
      created_by: createdBy,
    })
    .select()
    .single()

  if (revError || !reversalEntry) throw new Error('역분개 전표 생성 실패')

  // 명세 역전
  const reversalLineInserts = (original.lines ?? []).map((l: JournalEntryLine, idx: number) => ({
    journal_entry_id: reversalEntry.id,
    organization_id: organizationId,
    account_id: l.account_id,
    debit_amount: l.credit_amount,
    credit_amount: l.debit_amount,
    description: l.description,
    property_id: l.property_id,
    contract_id: l.contract_id,
    line_order: idx,
  }))

  await supabase.from('journal_entry_lines').insert(reversalLineInserts)

  // 원전표 역분개 처리 표시
  await supabase
    .from('journal_entries')
    .update({ is_reversed: true, reversed_by: reversalEntry.id })
    .eq('id', originalEntryId)

  return reversalEntry
}

// ── 시산표 (Trial Balance) 조회 ──────────────────────────

export async function getTrialBalance(
  supabase: Client,
  organizationId: string,
  fiscalYearId: string,
) {
  const { data, error } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit_amount,
      credit_amount,
      account:chart_of_accounts!account_id (
        code, name, account_type, normal_balance
      ),
      journal_entry:journal_entries!journal_entry_id (
        status, fiscal_year_id
      )
    `)
    .eq('organization_id', organizationId)
    .eq('journal_entry.fiscal_year_id', fiscalYearId)
    .eq('journal_entry.status', 'posted')

  if (error) throw new Error(`시산표 조회 실패: ${error.message}`)

  // 계정별 집계
  const accountMap: Record<string, {
    code: string; name: string; account_type: string;
    debit: number; credit: number
  }> = {}

  for (const line of data ?? []) {
    const account = (line.account as unknown) as { code: string; name: string; account_type: string } | null
    if (!account) continue
    const key = account.code
    if (!accountMap[key]) {
      accountMap[key] = { ...account, debit: 0, credit: 0 }
    }
    accountMap[key].debit += line.debit_amount
    accountMap[key].credit += line.credit_amount
  }

  return Object.values(accountMap)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(r => ({
      ...r,
      balance: r.debit - r.credit,
    }))
}
