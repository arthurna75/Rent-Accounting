'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AccountMonthly {
  code: string
  name: string
  months: number[]
  total: number
}

export interface PLStatsData {
  year: number
  revenues: AccountMonthly[]
  expenses: AccountMonthly[]
  revenue_by_month: number[]
  expense_by_month: number[]
  net_income_by_month: number[]
  total_revenue: number
  total_expense: number
  total_net_income: number
}

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function amt(n: number) {
  if (n === 0) return <span className="text-gray-300">—</span>
  return <span>{n.toLocaleString('ko-KR')}</span>
}

function netAmt(n: number) {
  if (n === 0) return <span className="text-gray-300">—</span>
  return (
    <span className={cn('font-semibold', n > 0 ? 'text-blue-700' : 'text-red-600')}>
      {n < 0 ? '▼' : ''}{Math.abs(n).toLocaleString('ko-KR')}
    </span>
  )
}

const TH = 'px-2 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap min-w-[72px]'
const TD = 'px-2 py-1.5 text-right text-xs tabular-nums whitespace-nowrap'
const STICKY = 'sticky left-0 z-10'

export function PLStatsTable({ data }: { data: PLStatsData }) {
  const [revenueOpen, setRevenueOpen] = useState(true)
  const [expenseOpen, setExpenseOpen] = useState(true)

  const { revenues, expenses, revenue_by_month, expense_by_month, net_income_by_month,
          total_revenue, total_expense, total_net_income } = data

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full border-collapse text-sm" style={{ minWidth: 1020 }}>
        {/* 헤더 */}
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className={cn(STICKY, 'bg-gray-100 text-left px-3 py-2.5 text-xs font-semibold text-gray-600 w-44 min-w-[176px] border-r border-gray-200')}>
              항목
            </th>
            {MONTH_LABELS.map(m => (
              <th key={m} className={TH}>{m}</th>
            ))}
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 bg-gray-200 whitespace-nowrap min-w-[88px]">합계</th>
          </tr>
        </thead>

        <tbody>
          {/* ── 수익 섹션 헤더 ── */}
          <tr
            className="bg-blue-50 hover:bg-blue-100 cursor-pointer select-none border-b border-blue-100"
            onClick={() => setRevenueOpen(o => !o)}
          >
            <td className={cn(STICKY, 'bg-blue-50 px-3 py-2 border-r border-blue-200')}>
              <div className="flex items-center gap-1.5 font-semibold text-blue-800 text-xs">
                {revenueOpen
                  ? <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                }
                수익
              </div>
            </td>
            {Array(12).fill(null).map((_, i) => (
              <td key={i} className={cn(TD, 'text-blue-600')}>
                {revenueOpen ? '' : amt(revenue_by_month[i])}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700 bg-blue-100 whitespace-nowrap tabular-nums">
              {total_revenue.toLocaleString('ko-KR')}
            </td>
          </tr>

          {/* 수익 항목 (펼쳐진 상태) */}
          {revenueOpen && revenues.map(item => (
            <tr key={item.code} className="border-b border-gray-100 hover:bg-gray-50">
              <td className={cn(STICKY, 'bg-white pl-8 pr-3 py-1.5 text-xs text-gray-700 border-r border-gray-100 truncate max-w-[176px]')}>
                {item.name}
              </td>
              {item.months.map((v, i) => (
                <td key={i} className={TD}>{amt(v)}</td>
              ))}
              <td className="px-3 py-1.5 text-right text-xs font-medium text-gray-800 bg-gray-50 tabular-nums whitespace-nowrap">
                {item.total.toLocaleString('ko-KR')}
              </td>
            </tr>
          ))}

          {/* 수익 합계 */}
          <tr className="border-b-2 border-blue-200 bg-blue-50/60">
            <td className={cn(STICKY, 'bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 border-r border-blue-200')}>
              수익 합계
            </td>
            {revenue_by_month.map((v, i) => (
              <td key={i} className={cn(TD, 'text-blue-700 font-medium')}>{amt(v)}</td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-bold text-blue-800 bg-blue-100 whitespace-nowrap tabular-nums">
              {total_revenue.toLocaleString('ko-KR')}
            </td>
          </tr>

          {/* ── 비용 섹션 헤더 ── */}
          <tr
            className="bg-red-50 hover:bg-red-100 cursor-pointer select-none border-b border-red-100"
            onClick={() => setExpenseOpen(o => !o)}
          >
            <td className={cn(STICKY, 'bg-red-50 px-3 py-2 border-r border-red-200')}>
              <div className="flex items-center gap-1.5 font-semibold text-red-800 text-xs">
                {expenseOpen
                  ? <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                }
                비용
              </div>
            </td>
            {Array(12).fill(null).map((_, i) => (
              <td key={i} className={cn(TD, 'text-red-600')}>
                {expenseOpen ? '' : amt(expense_by_month[i])}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-semibold text-red-700 bg-red-100 whitespace-nowrap tabular-nums">
              {total_expense.toLocaleString('ko-KR')}
            </td>
          </tr>

          {/* 비용 항목 (펼쳐진 상태) */}
          {expenseOpen && expenses.map(item => (
            <tr key={item.code} className="border-b border-gray-100 hover:bg-gray-50">
              <td className={cn(STICKY, 'bg-white pl-8 pr-3 py-1.5 text-xs text-gray-700 border-r border-gray-100 truncate max-w-[176px]')}>
                {item.name}
              </td>
              {item.months.map((v, i) => (
                <td key={i} className={TD}>{amt(v)}</td>
              ))}
              <td className="px-3 py-1.5 text-right text-xs font-medium text-gray-800 bg-gray-50 tabular-nums whitespace-nowrap">
                {item.total.toLocaleString('ko-KR')}
              </td>
            </tr>
          ))}

          {/* 비용 합계 */}
          <tr className="border-b-2 border-red-200 bg-red-50/60">
            <td className={cn(STICKY, 'bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 border-r border-red-200')}>
              비용 합계
            </td>
            {expense_by_month.map((v, i) => (
              <td key={i} className={cn(TD, 'text-red-700 font-medium')}>{amt(v)}</td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-bold text-red-800 bg-red-100 whitespace-nowrap tabular-nums">
              {total_expense.toLocaleString('ko-KR')}
            </td>
          </tr>

          {/* ── 영업이익 ── */}
          <tr className="bg-gray-800">
            <td className={cn(STICKY, 'bg-gray-800 px-3 py-3 text-xs font-bold text-white border-r border-gray-600')}>
              영업이익
            </td>
            {net_income_by_month.map((v, i) => (
              <td key={i} className={cn('px-2 py-3 text-right text-xs tabular-nums whitespace-nowrap font-semibold', v >= 0 ? 'text-blue-300' : 'text-red-400')}>
                {v === 0 ? <span className="text-gray-500">—</span> : (
                  <>{v < 0 ? '▼' : ''}{Math.abs(v).toLocaleString('ko-KR')}</>
                )}
              </td>
            ))}
            <td className={cn('px-3 py-3 text-right text-sm font-bold whitespace-nowrap tabular-nums bg-gray-700', total_net_income >= 0 ? 'text-blue-300' : 'text-red-400')}>
              {total_net_income < 0 ? '▼' : ''}{Math.abs(total_net_income).toLocaleString('ko-KR')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
