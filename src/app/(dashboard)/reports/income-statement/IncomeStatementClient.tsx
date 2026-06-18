'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatKRW } from '@/lib/utils/format'

interface AccountItem {
  code: string
  name: string
  account_type: string
  account_subtype: string | null
  normal_balance: string
  net_amount: number
}

interface IncomeData {
  period: { year: number; month: number | null; from_date: string; to_date: string }
  revenues: AccountItem[]
  expenses: AccountItem[]
  summary: {
    total_revenue: number
    total_expense: number
    net_income: number
    net_income_rate: number
  }
}

interface Props {
  currentYear: number
}

function AccountLine({ item }: { item: AccountItem }) {
  return (
    <div className="flex justify-between py-1 px-2 text-sm">
      <span className="text-gray-700 ml-4">{item.name}</span>
      <span className="text-gray-900 tabular-nums">{formatKRW(item.net_amount)}</span>
    </div>
  )
}

export function IncomeStatementClient({ currentYear }: Props) {
  const [mode, setMode] = useState<'year' | 'custom'>('year')
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState<number | ''>('')
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(`${currentYear}-12-31`)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<IncomeData | null>(null)
  const [error, setError] = useState<string | null>(null)

  function buildUrl(): string {
    if (mode === 'year') {
      const params = new URLSearchParams({ year: String(year) })
      if (month !== '') params.set('month', String(month))
      return `/api/reports/income-statement?${params.toString()}`
    } else {
      return `/api/reports/income-statement?year=${new Date(fromDate).getFullYear()}&from=${fromDate}&to=${toDate}`
    }
  }

  async function handleFetch() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(buildUrl())
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '조회 중 오류가 발생했습니다.')
        return
      }
      setData(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const netIncomePositive = (data?.summary.net_income ?? 0) >= 0

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Tabs value={mode} onValueChange={v => setMode(v as 'year' | 'custom')}>
            <TabsList className="mb-4">
              <TabsTrigger value="year">연도/월 선택</TabsTrigger>
              <TabsTrigger value="custom">기간 직접입력</TabsTrigger>
            </TabsList>

            <TabsContent value="year">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">연도</label>
                  <select
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {years.map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">월 (선택)</label>
                  <select
                    value={month}
                    onChange={e => setMonth(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">전체</option>
                    {months.map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                </div>
                <Button onClick={handleFetch} disabled={loading}>
                  {loading ? '조회 중...' : '조회'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="custom">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">시작일</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">종료일</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <Button onClick={handleFetch} disabled={loading}>
                  {loading ? '조회 중...' : '조회'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {data.period.month
                ? `${data.period.year}년 ${data.period.month}월`
                : `${data.period.year}년`} 손익계산서
            </CardTitle>
            <p className="text-xs text-gray-400">{data.period.from_date} ~ {data.period.to_date}</p>
          </CardHeader>
          <CardContent>
            {/* 수익 */}
            <div className="mb-4">
              <div className="flex justify-between items-center py-1 px-2">
                <span className="font-semibold text-gray-900">수익</span>
              </div>
              {data.revenues.length > 0 ? (
                data.revenues.map(item => <AccountLine key={item.code} item={item} />)
              ) : (
                <p className="text-sm text-gray-400 px-2 py-1 ml-4">수익 내역이 없습니다.</p>
              )}
              <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between text-sm font-medium px-2">
                <span>수익 합계</span>
                <span className="text-blue-600 tabular-nums">{formatKRW(data.summary.total_revenue)}</span>
              </div>
            </div>

            {/* 비용 */}
            <div className="mb-4">
              <div className="flex justify-between items-center py-1 px-2">
                <span className="font-semibold text-gray-900">비용</span>
              </div>
              {data.expenses.length > 0 ? (
                data.expenses.map(item => <AccountLine key={item.code} item={item} />)
              ) : (
                <p className="text-sm text-gray-400 px-2 py-1 ml-4">비용 내역이 없습니다.</p>
              )}
              <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between text-sm font-medium px-2">
                <span>비용 합계</span>
                <span className="text-red-600 tabular-nums">{formatKRW(data.summary.total_expense)}</span>
              </div>
            </div>

            {/* 영업이익 */}
            <div className={`border-t-2 border-gray-900 mt-4 pt-4 rounded-b-md px-2 pb-2 ${netIncomePositive ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">영업이익</span>
                <div className="text-right">
                  <span className={`text-xl font-bold tabular-nums ${netIncomePositive ? 'text-blue-700' : 'text-red-600'}`}>
                    {netIncomePositive ? '' : '▼ '}{formatKRW(Math.abs(data.summary.net_income))}
                  </span>
                  {data.summary.total_revenue > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      이익률: {data.summary.net_income_rate.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
