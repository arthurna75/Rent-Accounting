'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/utils/format'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'

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
  비용지출: 'text-red-700 bg-red-50',
  일반: 'text-gray-700 bg-gray-50',
}

export function JournalLedgerTable({ entries, page, totalPages, total }: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('이 전표를 삭제하시겠습니까? 임시 상태의 전표만 삭제됩니다.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/accounting/journal-entries/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? '삭제에 실패했습니다.')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleApprove(id: string) {
    setApprovingId(id)
    try {
      const res = await fetch(`/api/accounting/journal-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? '확정에 실패했습니다.')
        return
      }
      router.refresh()
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  전표가 없습니다.
                </td>
              </tr>
            )}
            {entries.map(entry => {
              const totalDebit = entry.lines.reduce((s, l) => s + l.debit_amount, 0)
              const totalCredit = entry.lines.reduce((s, l) => s + l.credit_amount, 0)
              const statusConfig = STATUS_LABELS[entry.status]
              const typeColor = TYPE_COLORS[entry.entry_type] ?? TYPE_COLORS['일반']
              const isDeleting = deletingId === entry.id

              return (
                <tr
                  key={entry.id}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    entry.status === 'reversed' && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-700">{entry.entry_number}</span>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {entry.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleApprove(entry.id)}
                            disabled={approvingId === entry.id}
                            className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                            title="확정 (손익통계·보고서에 반영)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/accounting/journal/${entry.id}/edit`}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={isDeleting}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
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
