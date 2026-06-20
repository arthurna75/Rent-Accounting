/**
 * 손익통계 API — 월별 수익·비용 집계
 * GET /api/reports/pl-stats?year=2026
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = parseInt(
    new URL(req.url).searchParams.get('year') ?? String(new Date().getFullYear()),
  )

  // Step 1: 해당 연도의 posted 전표 ID 조회 (embedded filter 대신 2단계 쿼리로 안정성 확보)
  const { data: entries, error: entryErr } = await supabase
    .from('journal_entries')
    .select('id, entry_date')
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)
    .eq('status', 'posted')

  if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })

  const entryMap: Record<string, string> = {}
  const entryIds: string[] = (entries ?? []).map(e => {
    entryMap[e.id] = e.entry_date
    return e.id
  })

  if (entryIds.length === 0) {
    return NextResponse.json({
      data: {
        year,
        revenues: [],
        expenses: [],
        revenue_by_month: Array(12).fill(0),
        expense_by_month: Array(12).fill(0),
        net_income_by_month: Array(12).fill(0),
        total_revenue: 0,
        total_expense: 0,
        total_net_income: 0,
      },
    })
  }

  // Step 2: 해당 전표 ID의 라인 + 계정과목 조회
  const { data: lines, error } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit_amount,
      credit_amount,
      journal_entry_id,
      account:chart_of_accounts!account_id (
        code, name, account_type, normal_balance
      )
    `)
    .in('journal_entry_id', entryIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type AcctMeta = { code: string; name: string; account_type: string; normal_balance: string }

  // account_code → { meta, months[0..11] }
  const map: Record<string, { meta: AcctMeta; months: number[] }> = {}

  for (const line of lines ?? []) {
    const acct = (line.account as unknown) as AcctMeta | null
    if (!acct) continue
    if (!['수익', '비용'].includes(acct.account_type)) continue

    const entryDate = entryMap[line.journal_entry_id]
    if (!entryDate) continue
    const monthIdx = new Date(entryDate).getMonth()

    if (!map[acct.code]) {
      map[acct.code] = { meta: acct, months: Array(12).fill(0) }
    }

    const net = acct.normal_balance === '대변'
      ? line.credit_amount - line.debit_amount
      : line.debit_amount - line.credit_amount

    map[acct.code].months[monthIdx] += net
  }

  const allEntries = Object.values(map)

  function buildAccounts(type: '수익' | '비용') {
    return allEntries
      .filter(e => e.meta.account_type === type)
      .sort((a, b) => a.meta.code.localeCompare(b.meta.code))
      .map(e => ({
        code: e.meta.code,
        name: e.meta.name,
        months: e.months,
        total: e.months.reduce((s, v) => s + v, 0),
      }))
  }

  const revenues = buildAccounts('수익')
  const expenses = buildAccounts('비용')

  const sumByMonth = (items: ReturnType<typeof buildAccounts>) =>
    Array.from({ length: 12 }, (_, i) => items.reduce((s, a) => s + a.months[i], 0))

  const revenueByMonth = sumByMonth(revenues)
  const expenseByMonth = sumByMonth(expenses)
  const netByMonth     = revenueByMonth.map((v, i) => v - expenseByMonth[i])

  const totalRevenue   = revenueByMonth.reduce((s, v) => s + v, 0)
  const totalExpense   = expenseByMonth.reduce((s, v) => s + v, 0)
  const totalNetIncome = totalRevenue - totalExpense

  return NextResponse.json({
    data: {
      year,
      revenues,
      expenses,
      revenue_by_month: revenueByMonth,
      expense_by_month: expenseByMonth,
      net_income_by_month: netByMonth,
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      total_net_income: totalNetIncome,
    },
  })
}
