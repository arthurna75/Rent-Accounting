'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintButton } from '@/components/ui/PrintButton'
import { PLStatsTable, type PLStatsData } from '../pl-stats/PLStatsTable'
import { cn } from '@/lib/utils'

type ViewMode = '연' | '분기' | '월'

const Q_RANGES: readonly [number, number, number][] = [[0,1,2],[3,4,5],[6,7,8],[9,10,11]]
const Q_LABELS = ['1분기 (1~3월)', '2분기 (4~6월)', '3분기 (7~9월)', '4분기 (10~12월)']

function toQuarterly(months: number[]): number[] {
  return Q_RANGES.map(idxs => idxs.reduce((s, i) => s + months[i], 0))
}

function amt(n: number) {
  if (n === 0) return <span className="text-gray-300">—</span>
  return <span>{n.toLocaleString('ko-KR')}</span>
}

const TH = 'px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap min-w-[110px]'
const TD = 'px-3 py-1.5 text-right text-xs tabular-nums whitespace-nowrap'
const STICKY = 'sticky left-0 z-10'

function QuarterlyTable({ data }: { data: PLStatsData }) {
  const [revenueOpen, setRevenueOpen] = useState(true)
  const [expenseOpen, setExpenseOpen] = useState(true)

  const rev_q = toQuarterly(data.revenue_by_month)
  const exp_q = toQuarterly(data.expense_by_month)
  const net_q = toQuarterly(data.net_income_by_month)

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full border-collapse text-sm" style={{ minWidth: 620 }}>
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className={cn(STICKY, 'bg-gray-100 text-left px-3 py-2.5 text-xs font-semibold text-gray-600 w-44 min-w-[176px] border-r border-gray-200')}>
              항목
            </th>
            {Q_LABELS.map(q => <th key={q} className={TH}>{q}</th>)}
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 bg-gray-200 whitespace-nowrap min-w-[100px]">합계</th>
          </tr>
        </thead>
        <tbody>
          {/* 수익 섹션 */}
          <tr className="bg-blue-50 hover:bg-blue-100 cursor-pointer select-none border-b border-blue-100"
              onClick={() => setRevenueOpen(o => !o)}>
            <td className={cn(STICKY, 'bg-blue-50 px-3 py-2 border-r border-blue-200')}>
              <div className="flex items-center gap-1.5 font-semibold text-blue-800 text-xs">
                {revenueOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                수익
              </div>
            </td>
            {rev_q.map((v, i) => (
              <td key={i} className={cn(TD, 'text-blue-600')}>{revenueOpen ? '' : amt(v)}</td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700 bg-blue-100 tabular-nums whitespace-nowrap">
              {data.total_revenue.toLocaleString('ko-KR')}
            </td>
          </tr>
          {revenueOpen && data.revenues.map(item => {
            const quarters = toQuarterly(item.months)
            return (
              <tr key={item.code} className="border-b border-gray-100 hover:bg-gray-50">
                <td className={cn(STICKY, 'bg-white pl-8 pr-3 py-1.5 text-xs text-gray-700 border-r border-gray-100 truncate max-w-[176px]')}>
                  {item.name}
                </td>
                {quarters.map((v, i) => <td key={i} className={TD}>{amt(v)}</td>)}
                <td className="px-3 py-1.5 text-right text-xs font-medium text-gray-800 bg-gray-50 tabular-nums whitespace-nowrap">
                  {item.total.toLocaleString('ko-KR')}
                </td>
              </tr>
            )
          })}
          <tr className="border-b-2 border-blue-200 bg-blue-50/60">
            <td className={cn(STICKY, 'bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 border-r border-blue-200')}>수익 합계</td>
            {rev_q.map((v, i) => <td key={i} className={cn(TD, 'text-blue-700 font-medium')}>{amt(v)}</td>)}
            <td className="px-3 py-2 text-right text-xs font-bold text-blue-800 bg-blue-100 tabular-nums whitespace-nowrap">
              {data.total_revenue.toLocaleString('ko-KR')}
            </td>
          </tr>

          {/* 비용 섹션 */}
          <tr className="bg-red-50 hover:bg-red-100 cursor-pointer select-none border-b border-red-100"
              onClick={() => setExpenseOpen(o => !o)}>
            <td className={cn(STICKY, 'bg-red-50 px-3 py-2 border-r border-red-200')}>
              <div className="flex items-center gap-1.5 font-semibold text-red-800 text-xs">
                {expenseOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                비용
              </div>
            </td>
            {exp_q.map((v, i) => (
              <td key={i} className={cn(TD, 'text-red-600')}>{expenseOpen ? '' : amt(v)}</td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-semibold text-red-700 bg-red-100 tabular-nums whitespace-nowrap">
              {data.total_expense.toLocaleString('ko-KR')}
            </td>
          </tr>
          {expenseOpen && data.expenses.map(item => {
            const quarters = toQuarterly(item.months)
            return (
              <tr key={item.code} className="border-b border-gray-100 hover:bg-gray-50">
                <td className={cn(STICKY, 'bg-white pl-8 pr-3 py-1.5 text-xs text-gray-700 border-r border-gray-100 truncate max-w-[176px]')}>
                  {item.name}
                </td>
                {quarters.map((v, i) => <td key={i} className={TD}>{amt(v)}</td>)}
                <td className="px-3 py-1.5 text-right text-xs font-medium text-gray-800 bg-gray-50 tabular-nums whitespace-nowrap">
                  {item.total.toLocaleString('ko-KR')}
                </td>
              </tr>
            )
          })}
          <tr className="border-b-2 border-red-200 bg-red-50/60">
            <td className={cn(STICKY, 'bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 border-r border-red-200')}>비용 합계</td>
            {exp_q.map((v, i) => <td key={i} className={cn(TD, 'text-red-700 font-medium')}>{amt(v)}</td>)}
            <td className="px-3 py-2 text-right text-xs font-bold text-red-800 bg-red-100 tabular-nums whitespace-nowrap">
              {data.total_expense.toLocaleString('ko-KR')}
            </td>
          </tr>

          {/* 영업이익 */}
          <tr className="bg-gray-800">
            <td className={cn(STICKY, 'bg-gray-800 px-3 py-3 text-xs font-bold text-white border-r border-gray-600')}>영업이익</td>
            {net_q.map((v, i) => (
              <td key={i} className={cn('px-3 py-3 text-right text-xs tabular-nums whitespace-nowrap font-semibold', v >= 0 ? 'text-blue-300' : 'text-red-400')}>
                {v === 0 ? <span className="text-gray-500">—</span> : <>{v < 0 ? '▼' : ''}{Math.abs(v).toLocaleString('ko-KR')}</>}
              </td>
            ))}
            <td className={cn('px-3 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap bg-gray-700', data.total_net_income >= 0 ? 'text-blue-300' : 'text-red-400')}>
              {data.total_net_income < 0 ? '▼' : ''}{Math.abs(data.total_net_income).toLocaleString('ko-KR')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function AnnualView({ data }: { data: PLStatsData }) {
  const revenues = data.revenues.filter(r => r.total !== 0)
  const expenses = data.expenses.filter(e => e.total !== 0)
  const totalRevenue = data.total_revenue
  const totalExpense = data.total_expense
  const netIncome = data.total_net_income
  const positive = netIncome >= 0

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
          <span className="text-xs font-semibold text-blue-800">수익</span>
        </div>
        {revenues.length === 0
          ? <p className="text-xs text-gray-400 px-4 py-3">수익 내역이 없습니다.</p>
          : revenues.map(r => (
            <div key={r.code} className="flex justify-between px-4 py-2 text-sm border-b border-gray-50 last:border-0">
              <span className="text-gray-600 ml-2">{r.name}</span>
              <span className="tabular-nums text-gray-900">{r.total.toLocaleString('ko-KR')}</span>
            </div>
          ))
        }
        <div className="flex justify-between px-4 py-2 bg-blue-50/60 border-t border-blue-100 text-xs font-semibold">
          <span className="text-blue-800">수익 합계</span>
          <span className="text-blue-700 tabular-nums">{totalRevenue.toLocaleString('ko-KR')}</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-red-50 px-4 py-2 border-b border-red-100">
          <span className="text-xs font-semibold text-red-800">비용</span>
        </div>
        {expenses.length === 0
          ? <p className="text-xs text-gray-400 px-4 py-3">비용 내역이 없습니다.</p>
          : expenses.map(e => (
            <div key={e.code} className="flex justify-between px-4 py-2 text-sm border-b border-gray-50 last:border-0">
              <span className="text-gray-600 ml-2">{e.name}</span>
              <span className="tabular-nums text-gray-900">{e.total.toLocaleString('ko-KR')}</span>
            </div>
          ))
        }
        <div className="flex justify-between px-4 py-2 bg-red-50/60 border-t border-red-100 text-xs font-semibold">
          <span className="text-red-800">비용 합계</span>
          <span className="text-red-700 tabular-nums">{totalExpense.toLocaleString('ko-KR')}</span>
        </div>
      </div>

      <div className={cn('rounded-lg border-2 px-4 py-4 flex justify-between items-center',
        positive ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50')}>
        <span className="font-bold text-gray-900">영업이익</span>
        <div className="text-right">
          <span className={cn('text-xl font-bold tabular-nums', positive ? 'text-blue-700' : 'text-red-600')}>
            {netIncome < 0 ? '▼ ' : ''}{Math.abs(netIncome).toLocaleString('ko-KR')}
          </span>
          {totalRevenue > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              이익률: {(Math.round((netIncome / totalRevenue) * 10000) / 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  currentYear: number
}

export function IncomeStatementClient({ currentYear }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('월')
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<PLStatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  async function fetchData(y: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/pl-stats?year=${y}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '조회에 실패했습니다.')
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(currentYear) }, [])

  function handleYearChange(y: number) {
    setYear(y)
    fetchData(y)
  }

  const VIEW_MODES: ViewMode[] = ['월', '분기', '연']

  return (
    <div className="space-y-5">
      {/* 조회 컨트롤 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 조회 단위 토글 */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
          {VIEW_MODES.map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                viewMode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* 연도 선택 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">연도</label>
          <select
            value={year}
            onChange={e => handleYearChange(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>

        <Button onClick={() => fetchData(year)} disabled={loading} size="sm">
          {loading ? '조회 중...' : '조회'}
        </Button>

        {data && !loading && <PrintButton />}
        {viewMode === '월' && data && !loading && (
          <span className="text-xs text-gray-400">수익·비용 행을 클릭하면 항목을 접거나 펼칠 수 있습니다.</span>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">데이터를 불러오는 중...</div>
      )}

      {!loading && data && (
        data.revenues.length === 0 && data.expenses.length === 0 ? (
          <div className="rounded-md border bg-gray-50 py-16 text-center text-sm text-gray-400">
            {data.year}년에 등록된 전표(posted) 데이터가 없습니다.
          </div>
        ) : (
          <>
            {viewMode === '월'   && <PLStatsTable data={data} />}
            {viewMode === '분기' && <QuarterlyTable data={data} />}
            {viewMode === '연'   && <AnnualView data={data} />}
          </>
        )
      )}
    </div>
  )
}
