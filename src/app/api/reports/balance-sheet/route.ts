/**
 * 재무상태표 API
 * GET /api/reports/balance-sheet?date=2026-12-31
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const asOfDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  // 기준일까지의 모든 posted 전표 명세 집계
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
    .lte('journal_entry.entry_date', asOfDate)
    .eq('journal_entry.status', 'posted')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accountBalances: Record<string, {
    code: string; name: string; account_type: string;
    account_subtype: string | null; normal_balance: string;
    balance: number
  }> = {}

  for (const line of lines ?? []) {
    const acct = (line.account as unknown) as {
      code: string; name: string; account_type: string;
      account_subtype: string | null; normal_balance: string
    } | null
    if (!acct) continue

    const key = acct.code
    if (!accountBalances[key]) {
      accountBalances[key] = { ...acct, balance: 0 }
    }

    if (acct.normal_balance === '차변') {
      accountBalances[key].balance += line.debit_amount - line.credit_amount
    } else {
      accountBalances[key].balance += line.credit_amount - line.debit_amount
    }
  }

  const all = Object.values(accountBalances).sort((a, b) => a.code.localeCompare(b.code))

  const assets = all.filter(a => a.account_type === '자산')
  const liabilities = all.filter(a => a.account_type === '부채')
  const equity = all.filter(a => a.account_type === '자본')

  // 자산은 감가상각누계액(대변 잔액)을 음수로 표시
  const totalAssets = assets.reduce((s, a) => {
    return s + (a.normal_balance === '대변' ? -a.balance : a.balance)
  }, 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0)

  // 재무상태표 등식 검증
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1

  return NextResponse.json({
    data: {
      as_of_date: asOfDate,
      assets: {
        current: assets.filter(a => a.account_subtype === '유동자산'),
        non_current: assets.filter(a => a.account_subtype === '비유동자산'),
        total: totalAssets,
      },
      liabilities: {
        current: liabilities.filter(a => a.account_subtype === '유동부채'),
        non_current: liabilities.filter(a => a.account_subtype === '비유동부채'),
        total: totalLiabilities,
      },
      equity: {
        items: equity,
        total: totalEquity,
      },
      summary: {
        total_assets: totalAssets,
        total_liabilities_and_equity: totalLiabilities + totalEquity,
        is_balanced: isBalanced,
      },
    },
  })
}
