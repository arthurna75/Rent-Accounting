/**
 * 손익계산서 API
 * GET /api/reports/income-statement?year=2026&month=6
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

  const fromDate = month
    ? `${year}-${String(month).padStart(2, '0')}-01`
    : `${year}-01-01`
  const toDate = month
    ? `${year}-${String(month).padStart(2, '0')}-31`
    : `${year}-12-31`

  // posted 전표의 명세를 계정유형별로 집계
  const { data: lines, error } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit_amount,
      credit_amount,
      account:chart_of_accounts!account_id (
        code, name, account_type, account_subtype, normal_balance
      ),
      journal_entry:journal_entries!journal_entry_id (
        entry_date, status
      )
    `)
    .gte('journal_entry.entry_date', fromDate)
    .lte('journal_entry.entry_date', toDate)
    .eq('journal_entry.status', 'posted')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 계정별 집계
  const accountTotals: Record<string, {
    code: string; name: string; account_type: string;
    account_subtype: string | null; normal_balance: string;
    net_amount: number
  }> = {}

  for (const line of lines ?? []) {
    const acct = (line.account as unknown) as {
      code: string; name: string; account_type: string;
      account_subtype: string | null; normal_balance: string
    } | null
    if (!acct) continue
    if (!['수익', '비용'].includes(acct.account_type)) continue

    const key = acct.code
    if (!accountTotals[key]) {
      accountTotals[key] = { ...acct, net_amount: 0 }
    }

    // 정상잔액 방향 기준으로 순액 계산
    if (acct.normal_balance === '대변') {
      accountTotals[key].net_amount += line.credit_amount - line.debit_amount
    } else {
      accountTotals[key].net_amount += line.debit_amount - line.credit_amount
    }
  }

  const revenues = Object.values(accountTotals)
    .filter(a => a.account_type === '수익')
    .sort((a, b) => a.code.localeCompare(b.code))

  const expenses = Object.values(accountTotals)
    .filter(a => a.account_type === '비용')
    .sort((a, b) => a.code.localeCompare(b.code))

  const totalRevenue = revenues.reduce((s, a) => s + a.net_amount, 0)
  const totalExpense = expenses.reduce((s, a) => s + a.net_amount, 0)
  const netIncome = totalRevenue - totalExpense

  return NextResponse.json({
    data: {
      period: { year, month, from_date: fromDate, to_date: toDate },
      revenues,
      expenses,
      summary: {
        total_revenue: totalRevenue,
        total_expense: totalExpense,
        net_income: netIncome,
        net_income_rate: totalRevenue > 0
          ? Math.round((netIncome / totalRevenue) * 10000) / 100
          : 0,
      },
    },
  })
}
