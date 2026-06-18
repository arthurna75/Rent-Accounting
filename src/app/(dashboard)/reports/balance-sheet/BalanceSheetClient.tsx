'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatKRW } from '@/lib/utils/format'

interface AccountItem {
  code: string
  name: string
  account_type: string
  account_subtype: string | null
  normal_balance: string
  balance: number
}

interface BalanceSheetData {
  as_of_date: string
  assets: {
    current: AccountItem[]
    non_current: AccountItem[]
    total: number
  }
  liabilities: {
    current: AccountItem[]
    non_current: AccountItem[]
    total: number
  }
  equity: {
    items: AccountItem[]
    total: number
  }
  summary: {
    total_assets: number
    total_liabilities_and_equity: number
    is_balanced: boolean
  }
}

interface Props {
  defaultDate: string
}

function AccountRows({ items }: { items: AccountItem[] }) {
  return (
    <>
      {items.map(item => (
        <div key={item.code} className="flex justify-between py-1 px-2 text-sm">
          <span className="text-gray-700 ml-4">{item.name}</span>
          <span className={item.normal_balance === '대변' ? 'text-red-600' : 'text-gray-900'}>
            {item.normal_balance === '대변'
              ? `(${formatKRW(item.balance)})`
              : formatKRW(item.balance)}
          </span>
        </div>
      ))}
    </>
  )
}

function Section({ title, items, total, negative = false }: {
  title: string
  items: AccountItem[]
  total: number
  negative?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-1">{title}</p>
      <AccountRows items={items} />
    </div>
  )
}

export function BalanceSheetClient({ defaultDate }: Props) {
  const [date, setDate] = useState(defaultDate)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFetch() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/balance-sheet?date=${date}`)
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

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">기준일자</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? '조회 중...' : '조회'}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {data && (
        <>
          {!data.summary.is_balanced && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              자산 합계와 부채+자본 합계가 일치하지 않습니다. 분개 데이터를 확인해 주세요.
              <br />
              자산: {formatKRW(data.summary.total_assets)} / 부채+자본: {formatKRW(data.summary.total_liabilities_and_equity)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 자산 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">자산</CardTitle>
              </CardHeader>
              <CardContent>
                <Section title="유동자산" items={data.assets.current} total={0} />
                <Section title="비유동자산" items={data.assets.non_current} total={0} />
                <div className="border-t-2 border-gray-900 mt-3 pt-3 flex justify-between font-semibold">
                  <span>자산 합계</span>
                  <span className="text-blue-700">{formatKRW(data.assets.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* 부채 & 자본 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">부채 및 자본</CardTitle>
              </CardHeader>
              <CardContent>
                <Section title="유동부채" items={data.liabilities.current} total={0} />
                <Section title="비유동부채" items={data.liabilities.non_current} total={0} />
                {data.liabilities.total > 0 && (
                  <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between text-sm font-medium mb-3">
                    <span className="ml-2">부채 합계</span>
                    <span>{formatKRW(data.liabilities.total)}</span>
                  </div>
                )}

                <Section title="자본" items={data.equity.items} total={0} />
                {data.equity.total > 0 && (
                  <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between text-sm font-medium mb-3">
                    <span className="ml-2">자본 합계</span>
                    <span>{formatKRW(data.equity.total)}</span>
                  </div>
                )}

                <div className="border-t-2 border-gray-900 mt-3 pt-3 flex justify-between font-semibold">
                  <span>부채 및 자본 합계</span>
                  <span className={data.summary.is_balanced ? 'text-blue-700' : 'text-red-600'}>
                    {formatKRW(data.summary.total_liabilities_and_equity)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-gray-400 text-center">
            기준일: {data.as_of_date}
            {data.summary.is_balanced && ' · 대차대조 일치 확인됨'}
          </p>
        </>
      )}
    </div>
  )
}
