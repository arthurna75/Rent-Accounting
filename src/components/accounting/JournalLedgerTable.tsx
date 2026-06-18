'use client'

import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/utils/format'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type EntryStatus = 'draft' | 'posted' | 'reversed'
type EntryType = string

interface JournalEntryRow {
  id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: EntryType
  status: EntryStatus
  lines: Array<{
    debit_amount: number
    credit_amount: number
    account: { code: string; name: string } | null
  }>
}

interface Props {
  entries: JournalEntryRow[]
  page: number
  totalPages: number
  total: number
}

const STATUS_LABELS: Record<EntryStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '임시', variant: 'outline' },
  posted: { label: '승인', variant: 'default' },
  reversed: { label: '역분개', variant: 'secondary' },
}

const TYPE_COLORS: Record<string, string> = {
  임대수익: 'text-green-700 bg-green-50',
  보증금수령: 'text-blue-700 bg-blue-50',
  보증금반환: 'text-orange-700 bg-orange-50',
  감가상각: 'text-purple-700 bg-purple-50',
  간주임대료: 'text-indigo-700 bg-indigo-50',
  일반: 'text-gray-700 bg-gray-50',
}

export function JournalLedgerTable({ entries, page, totalPages, total }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">전표번호</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">거래일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">적요</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">유형</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-32">차변 합계</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-32">대변 합계</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  전표가 없습니다.
                </td>
              </tr>
            )}
            {entries.map(entry => {
              const totalDebit = entry.lines.reduce((s, l) => s + l.debit_amount, 0)
              const totalCredit = entry.lines.reduce((s, l) => s + l.credit_amount, 0)
              const statusConfig = STATUS_LABELS[entry.status]
              const typeColor = TYPE_COLORS[entry.entry_type] ?? TYPE_COLORS['일반']

              return (
                <tr
                  key={entry.id}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    entry.status === 'reversed' && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/accounting/journal/${entry.id}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      {entry.entry_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums">{entry.entry_date}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{entry.description}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeColor)}>
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                    {formatKRW(totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                    {formatKRW(totalCredit)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500">총 {total.toLocaleString()}건</p>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`?page=${p}`}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded text-xs font-medium',
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
