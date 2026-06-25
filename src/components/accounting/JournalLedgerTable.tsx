'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatKRW } from '@/lib/utils/format'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, CheckCircle2, Filter, Loader2 } from 'lucide-react'

type EntryStatus = 'draft' | 'posted' | 'reversed'
type EntryType = string

interface JournalEntryRow {
  id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: EntryType
  status: EntryStatus
  vendor: { name: string } | null
  lines: Array<{
    debit_amount: number
    credit_amount: number
    account: { code: string; name: string } | null
    contract: {
      lessee_name: string
      property: { building_name: string; unit_number: string } | null
    } | null
  }>
}

interface Props {
  entries: JournalEntryRow[]
  page: number
  totalPages: number
  total: number
  filterStatus?: string
}

const STATUS_LABELS: Record<EntryStatus, { label: string; cls: string }> = {
  draft:    { label: '임시',   cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  posted:   { label: '승인',   cls: 'bg-green-50 text-green-700 border border-green-200' },
  reversed: { label: '역분개', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

const TYPE_COLORS: Record<string, string> = {
  임대수익:  'text-green-700 bg-green-50',
  보증금수령: 'text-blue-700 bg-blue-50',
  보증금반환: 'text-orange-700 bg-orange-50',
  감가상각:  'text-purple-700 bg-purple-50',
  간주임대료: 'text-indigo-700 bg-indigo-50',
  비용지출:  'text-red-700 bg-red-50',
  관리비:    'text-teal-700 bg-teal-50',
  세금:      'text-yellow-700 bg-yellow-50',
  일반:      'text-gray-700 bg-gray-100',
}

// 전표에서 첫 번째 계약의 호수 정보를 추출
function getAppliedUnit(entry: JournalEntryRow): string {
  for (const line of entry.lines) {
    if (line.contract?.property) {
      const { building_name, unit_number } = line.contract.property
      return unit_number
        ? `${building_name} ${unit_number}`
        : building_name
    }
  }
  return ''
}

export function JournalLedgerTable({ entries, page, totalPages, total, filterStatus }: Props) {
  const router = useRouter()

  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // 체크박스 선택 상태 (draft 전표만 선택 가능)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)

  const draftEntries = entries.filter(e => e.status === 'draft')
  const allDraftSelected = draftEntries.length > 0 && draftEntries.every(e => selectedIds.has(e.id))

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(allDraftSelected
      ? new Set()
      : new Set(draftEntries.map(e => e.id))
    )
  }

  // 임시만 보기 토글 — URL 파라미터로 서버 필터
  function toggleDraftFilter() {
    const q = new URLSearchParams()
    if (filterStatus !== 'draft') q.set('status', 'draft')
    q.set('page', '1')
    router.push(`?${q.toString()}`)
    setSelectedIds(new Set())
  }

  // 페이지 링크 URL (status 필터 유지)
  function pageHref(p: number) {
    const q = new URLSearchParams()
    if (filterStatus) q.set('status', filterStatus)
    q.set('page', String(p))
    return `?${q.toString()}`
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

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return
    if (!confirm(`선택된 ${selectedIds.size}건의 임시 전표를 승인하시겠습니까?`)) return
    setBulkApproving(true)
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map(id =>
          fetch(`/api/accounting/journal-entries/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          })
        )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) alert(`${failed}건 승인 실패. 나머지는 처리되었습니다.`)
      setSelectedIds(new Set())
      router.refresh()
    } finally {
      setBulkApproving(false)
    }
  }

  async function handleDelete(id: string, status: EntryStatus) {
    const msg = status === 'posted'
      ? '승인완료 전표를 삭제합니다. 정말 삭제하시겠습니까?'
      : '이 전표를 삭제하시겠습니까?'
    if (!confirm(msg)) return
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

  const isDraftFilter = filterStatus === 'draft'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

      {/* ── 툴바 ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-gray-100 bg-gray-50/60">
        {/* 임시만 보기 토글 */}
        <button
          onClick={toggleDraftFilter}
          className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors font-medium',
            isDraftFilter
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          임시만 보기
          {isDraftFilter && draftEntries.length > 0 && (
            <span className="ml-0.5 bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
              {total}
            </span>
          )}
        </button>

        {/* 일괄 승인 영역 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-amber-700">{selectedIds.size}건</span> 선택됨
            </span>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={handleBulkApprove}
              disabled={bulkApproving}
            >
              {bulkApproving
                ? <><Loader2 className="w-3 h-3 animate-spin" />승인 중...</>
                : <><CheckCircle2 className="w-3 h-3" />선택 승인</>
              }
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              선택 해제
            </button>
          </div>
        )}
      </div>

      {/* ── 테이블 ─────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* 체크박스 헤더 */}
              <th className="px-2 py-3 w-8">
                {draftEntries.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allDraftSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-amber-500 cursor-pointer"
                    title="임시 전표 전체 선택"
                  />
                )}
              </th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-28 hidden lg:table-cell">전표번호</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-24">거래일</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600">적요</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-32 hidden xl:table-cell">적용호수</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-24 hidden xl:table-cell">지급처</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-36 hidden sm:table-cell">유형 · 상태</th>
              <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">차변</th>
              <th className="text-right px-3 py-3 font-medium text-gray-600 w-24 hidden sm:table-cell">대변</th>
              <th className="text-center px-3 py-3 font-medium text-gray-600 w-14">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">
                  {isDraftFilter ? '임시 전표가 없습니다.' : '전표가 없습니다.'}
                </td>
              </tr>
            )}
            {entries.map(entry => {
              const totalDebit  = entry.lines.reduce((s, l) => s + l.debit_amount, 0)
              const totalCredit = entry.lines.reduce((s, l) => s + l.credit_amount, 0)
              const statusCfg   = STATUS_LABELS[entry.status]
              const typeColor   = TYPE_COLORS[entry.entry_type] ?? TYPE_COLORS['일반']
              const isDeleting  = deletingId === entry.id
              const isDraft     = entry.status === 'draft'
              const isSelected  = selectedIds.has(entry.id)
              const appliedUnit = getAppliedUnit(entry)

              return (
                <tr
                  key={entry.id}
                  className={cn(
                    'hover:bg-gray-50/60 transition-colors',
                    entry.status === 'reversed' && 'opacity-50',
                    isSelected && 'bg-amber-50/40',
                  )}
                >
                  {/* 체크박스 */}
                  <td className="px-2 py-3">
                    {isDraft ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(entry.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-amber-500 cursor-pointer"
                      />
                    ) : (
                      <span className="w-3.5 h-3.5 block" />
                    )}
                  </td>

                  {/* 전표번호 */}
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="font-mono text-xs text-gray-600">{entry.entry_number}</span>
                  </td>

                  {/* 거래일 */}
                  <td className="px-3 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                    {entry.entry_date}
                  </td>

                  {/* 적요 */}
                  <td className="px-3 py-3 text-gray-800 max-w-[100px] sm:max-w-[160px] xl:max-w-[200px] truncate">
                    <Link href={`/accounting/journal/${entry.id}`} className="hover:text-blue-600 hover:underline">
                      {entry.description}
                    </Link>
                  </td>

                  {/* 적용호수 */}
                  <td className="px-3 py-3 hidden xl:table-cell">
                    {appliedUnit
                      ? <span className="text-xs text-gray-700 whitespace-nowrap">{appliedUnit}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>

                  {/* 지급처 */}
                  <td className="px-3 py-3 hidden xl:table-cell">
                    {entry.vendor
                      ? <span className="text-xs text-gray-700 truncate max-w-[80px] block">{entry.vendor.name}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>

                  {/* 유형 · 상태 (좌우 배치) */}
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap', typeColor)}>
                        {entry.entry_type}
                      </span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap', statusCfg.cls)}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </td>

                  {/* 차변 */}
                  <td className="px-3 py-3 text-right tabular-nums text-xs text-gray-800">
                    {formatKRW(totalDebit)}
                  </td>

                  {/* 대변 */}
                  <td className="px-3 py-3 text-right tabular-nums text-xs text-gray-800 hidden sm:table-cell">
                    {formatKRW(totalCredit)}
                  </td>

                  {/* 관리 */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-0.5">
                      {isDraft && (
                        <button
                          onClick={() => handleApprove(entry.id)}
                          disabled={approvingId === entry.id}
                          className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="승인"
                        >
                          {approvingId === entry.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                      {entry.status !== 'reversed' && (
                        <>
                          <Link
                            href={`/accounting/journal/${entry.id}/edit`}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(entry.id, entry.status)}
                            disabled={isDeleting}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="삭제"
                          >
                            {isDeleting
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
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

      {/* ── 페이지네이션 ────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500">총 {total.toLocaleString()}건</p>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={pageHref(p)}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded text-xs font-medium',
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
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
