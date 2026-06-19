import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'
import { CheckCircle2 } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_BALANCE_SHEET, SAMPLE_INCOME_STATEMENT, SAMPLE_TRIAL_BALANCE } from '@/lib/sample-data'

// ── 재무상태표 ──────────────────────────────────────────
export function SampleBalanceSheet({ isGuest }: { isGuest: boolean }) {
  const bs = SAMPLE_BALANCE_SHEET
  const totalAssets =
    [...bs.assets.current, ...bs.assets.noncurrent].reduce((s, r) => s + r.amount, 0)
  const totalLiab =
    [...bs.liabilities.current, ...bs.liabilities.noncurrent].reduce((s, r) => s + r.amount, 0)
  const totalEquity = bs.equity.reduce((s, r) => s + r.amount, 0)

  const Row = ({ name, amount }: { name: string; amount: number }) => (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-700 pl-4">{name}</span>
      <span className={`font-medium tabular-nums ${amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
        {amount < 0 ? `(${formatKRW(Math.abs(amount))})` : formatKRW(amount)}
      </span>
    </div>
  )
  const SubTotal = ({ label, amount }: { label: string; amount: number }) => (
    <div className="flex justify-between py-1.5 text-sm border-t border-gray-200 mt-1 font-semibold">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900 tabular-nums">{formatKRW(amount)}</span>
    </div>
  )

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <h2 className="text-xl font-semibold text-gray-900">재무상태표</h2>
      <p className="text-sm text-gray-500">기준일: 2026-06-30</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 자산 */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">자 산</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Ⅰ. 유동자산</p>
              {bs.assets.current.map(r => <Row key={r.name} {...r} />)}
              <SubTotal label="유동자산 계" amount={bs.assets.current.reduce((s, r) => s + r.amount, 0)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Ⅱ. 비유동자산</p>
              {bs.assets.noncurrent.map(r => <Row key={r.name} {...r} />)}
              <SubTotal label="비유동자산 계" amount={bs.assets.noncurrent.reduce((s, r) => s + r.amount, 0)} />
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-400 font-bold text-sm">
              <span>자산 총계</span>
              <span className="text-blue-700 tabular-nums">{formatKRW(totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* 부채·자본 */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">부채 및 자본</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Ⅰ. 유동부채</p>
              {bs.liabilities.current.map(r => <Row key={r.name} {...r} />)}
              <SubTotal label="유동부채 계" amount={bs.liabilities.current.reduce((s, r) => s + r.amount, 0)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Ⅱ. 비유동부채</p>
              {bs.liabilities.noncurrent.map(r => <Row key={r.name} {...r} />)}
              <SubTotal label="비유동부채 계" amount={bs.liabilities.noncurrent.reduce((s, r) => s + r.amount, 0)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Ⅲ. 자본</p>
              {bs.equity.map(r => <Row key={r.name} {...r} />)}
              <SubTotal label="자본 계" amount={totalEquity} />
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-400 font-bold text-sm">
              <span>부채 및 자본 총계</span>
              <span className="text-orange-600 tabular-nums">{formatKRW(totalLiab + totalEquity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium text-green-700">재무상태표 균형 (자산 = 부채 + 자본)</span>
        </CardContent>
      </Card>
    </div>
  )
}

// ── 손익계산서 ──────────────────────────────────────────
export function SampleIncomeStatement({ isGuest }: { isGuest: boolean }) {
  const is = SAMPLE_INCOME_STATEMENT
  const totalRevenue = is.revenue.reduce((s, r) => s + r.amount, 0)
  const totalExpense = is.expenses.reduce((s, r) => s + r.amount, 0)
  const netIncome = totalRevenue - totalExpense

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <h2 className="text-xl font-semibold text-gray-900">손익계산서</h2>
      <p className="text-sm text-gray-500">기간: 2026-01-01 ~ 2026-06-30</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '총 수익', value: totalRevenue, color: 'text-green-700' },
          { label: '총 비용', value: totalExpense, color: 'text-red-600' },
          { label: '당기순이익', value: netIncome, color: 'text-blue-700' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{formatKRW(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">수 익</CardTitle></CardHeader>
          <CardContent>
            {is.revenue.map(r => (
              <div key={r.name} className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                <span className="text-gray-700 pl-3">{r.name}</span>
                <span className="text-green-700 font-medium tabular-nums">{formatKRW(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t border-gray-200 font-semibold text-sm mt-1">
              <span>수익 합계</span>
              <span className="text-green-700 tabular-nums">{formatKRW(totalRevenue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">비 용</CardTitle></CardHeader>
          <CardContent>
            {is.expenses.map(r => (
              <div key={r.name} className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                <span className="text-gray-700 pl-3">{r.name}</span>
                <span className="text-red-600 font-medium tabular-nums">{formatKRW(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t border-gray-200 font-semibold text-sm mt-1">
              <span>비용 합계</span>
              <span className="text-red-600 tabular-nums">{formatKRW(totalExpense)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── 시산표 ──────────────────────────────────────────────
const ACCOUNT_TYPE_ORDER = ['자산', '부채', '자본', '수익', '비용'] as const

export function SampleTrialBalance({ isGuest }: { isGuest: boolean }) {
  const rows = SAMPLE_TRIAL_BALANCE
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const grouped = Object.fromEntries(
    ACCOUNT_TYPE_ORDER.map(t => [t, rows.filter(r => r.account_type === t)])
  )

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <h2 className="text-xl font-semibold text-gray-900">시산표</h2>

      <Card>
        <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div><p className="text-xs text-gray-500 mb-0.5">총 차변</p><p className="text-base font-semibold text-blue-600">{formatKRW(totalDebit)}</p></div>
            <span className="text-gray-300 text-lg">=</span>
            <div><p className="text-xs text-gray-500 mb-0.5">총 대변</p><p className="text-base font-semibold text-orange-500">{formatKRW(totalCredit)}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-600">균형 (차변 = 대변)</span>
          </div>
        </CardContent>
      </Card>

      {ACCOUNT_TYPE_ORDER.filter(t => grouped[t]?.length).map(type => {
        const typeRows = grouped[type]
        const typeDebit = typeRows.reduce((s, r) => s + r.debit, 0)
        const typeCredit = typeRows.reduce((s, r) => s + r.credit, 0)
        return (
          <Card key={type}>
            <CardHeader className="pb-3"><CardTitle className="text-base">{type}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">계정코드</TableHead>
                    <TableHead>계정명</TableHead>
                    <TableHead className="text-right">차변합계</TableHead>
                    <TableHead className="text-right">대변합계</TableHead>
                    <TableHead className="text-right">잔액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeRows.map(r => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-sm">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right">{r.debit > 0 ? <span className="text-gray-700">{formatKRW(r.debit)}</span> : <span className="text-gray-300">—</span>}</TableCell>
                      <TableCell className="text-right">{r.credit > 0 ? <span className="text-gray-700">{formatKRW(r.credit)}</span> : <span className="text-gray-300">—</span>}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Math.abs(r.balance) > 0
                          ? <span className={r.balance > 0 ? 'text-blue-600' : 'text-red-500'}>{formatKRW(Math.abs(r.balance))}</span>
                          : <span className="text-gray-400">0원</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2} className="text-sm text-gray-600">{type} 소계</TableCell>
                    <TableCell className="text-right text-sm text-blue-700">{formatKRW(typeDebit)}</TableCell>
                    <TableCell className="text-right text-sm text-orange-600">{formatKRW(typeCredit)}</TableCell>
                    <TableCell className="text-right text-sm">{formatKRW(Math.abs(typeDebit - typeCredit))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
