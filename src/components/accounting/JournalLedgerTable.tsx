'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatKRW } from '@/lib/utils/format'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, CheckCircle2, Filter, Loader2, X, ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react'

type EntryStatus = 'draft' | 'posted' | 'reversed'
type EntryType = string

interface JournalEntryRow {
  id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: EntryType
  status: EntryStatus
  evidence_type?: string | null
  nts_verified?: boolean
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
  filterFrom?: string
  filterTo?: string
  filterQ?: string
  filterType?: string
  filterAccount?: string
  filterUnverifiedOnly?: boolean
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

const ENTRY_TYPES = [
  '일반', '임대수익', '보증금수령', '보증금반환',
  '감가상각', '간주임대료', '세금', '관리비', '비용지출',
]

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const result: (number | '...')[] = [1]
  if (current - 2 > 2) result.push('...')
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) result.push(i)
  if (current + 2 < total - 1) result.push('...')
  result.push(total)
  return result
}

function getAppliedUnit(entry: JournalEntryRow): string {
  for (const line of entry.lines) {
    if (line.contract?.property) {
      const { building_name, unit_number } = line.contract.property
      return unit_number ? `${building_name} ${unit_number}` : building_name
    }
  }
  return ''
}

export function JournalLedgerTable({
  entries, page, totalPages, total,
  filterStatus, filterFrom, filterTo, filterQ, filterType, filterAccount, filterUnverifiedOnly,
}: Props) {
  const router = useRouter()

  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)

  // 필터 패널 열림 여부
  const hasActiveFilter = !!(filterFrom || filterTo || filterQ || filterType || filterAccount || filterStatus)
  const [showFilter, setShowFilter] = useState(hasActiveFilter)

  // 로컬 필터 상태 (서버 props 기반 초기값)
  const [localFrom,    setLocalFrom]    = useState(filterFrom    ?? '')
  const [localTo,      setLocalTo]      = useState(filterTo      ?? '')
  const [localQ,       setLocalQ]       = useState(filterQ       ?? '')
  const [localType,    setLocalType]    = useState(filterType    ?? '')
  const [localStatus,  setLocalStatus]  = useState(filterStatus  ?? '')
  const [localAccount, setLocalAccount] = useState(filterAccount ?? '')

  const draftEntries     = entries.filter(e => e.status === 'draft')
  const allDraftSelected = draftEntries.length > 0 && draftEntries.every(e => selectedIds.has(e.id))

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(allDraftSelected ? new Set() : new Set(draftEntries.map(e => e.id)))
  }

  // URL 생성 (모든 필터 파라미터 보존)
  function buildUrl(opts: { status?: string; from?: string; to?: string; q?: string; type?: string; account?: string; unverified?: boolean; page?: number } = {}) {
    const q = new URLSearchParams()
    const s   = opts.status  !== undefined ? opts.status  : localStatus
    const frm = opts.from    !== undefined ? opts.from    : localFrom
    const to  = opts.to      !== undefined ? opts.to      : localTo
    const sq  = opts.q       !== undefined ? opts.q       : localQ
    const typ = opts.type    !== undefined ? opts.type    : localType
    const acc = opts.account !== undefined ? opts.account : localAccount
    const pg  = opts.page    !== undefined ? opts.page    : 1

    if (s)   q.set('status',  s)
    if (frm) q.set('from',    frm)
    if (to)  q.set('to',      to)
    if (sq)  q.set('q',       sq)
    if (typ) q.set('type',    typ)
    if (acc) q.set('account', acc)
    const unv = opts.unverified !== undefined ? opts.unverified : filterUnverifiedOnly
    if (unv) q.set('unverified', '1')
    q.set('page', String(pg))
    return `?${q.toString()}`
  }

  function toggleUnverifiedFilter() {
    const next = !filterUnverifiedOnly
    setSelectedIds(new Set())
    router.push(buildUrl({ unverified: next, page: 1 }))
  }

  function handleSearch() {
    setSelectedIds(new Set())
    router.push(buildUrl())
  }

  function handleReset() {
    setLocalFrom(''); setLocalTo(''); setLocalQ('')
    setLocalType(''); setLocalStatus(''); setLocalAccount('')
    setSelectedIds(new Set())
    router.push('?page=1')
  }

  // 임시만 보기 퀵 토글
  function toggleDraftFilter() {
    const next = filterStatus !== 'draft' ? 'draft' : ''
    setLocalStatus(next)
    setSelectedIds(new Set())
    router.push(buildUrl({ status: next }))
  }

  function pageHref(p: number) {
    return buildUrl({
      status: filterStatus, from: filterFrom, to: filterTo,
      q: filterQ, type: filterType, account: filterAccount, page: p,
    })
  }

  function setQuickDate(kind: 'thisMonth' | 'lastMonth' | 'thisYear') {
    const now = new Date()
    let from: string, to: string
    if (kind === 'thisMonth') {
      const y = now.getFullYear(), m = now.getMonth()
      from = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const last = new Date(y, m + 1, 0)
      to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    } else if (kind === 'lastMonth') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      from = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    } else {
      from = `${now.getFullYear()}-01-01`
      to   = `${now.getFullYear()}-12-31`
    }
    setLocalFrom(from)
    setLocalTo(to)
    setSelectedIds(new Set())
    router.push(buildUrl({ from, to, page: 1 }))
  }

  function removeFilter(key: 'type' | 'q' | 'account' | 'dates' | 'status') {
    if (key === 'type')   setLocalType('')
    if (key === 'q')      setLocalQ('')
    if (key === 'account') setLocalAccount('')
    if (key === 'dates')  { setLocalFrom(''); setLocalTo('') }
    if (key === 'status') setLocalStatus('')
    setSelectedIds(new Set())
    const q = new URLSearchParams()
    if (filterStatus  && key !== 'status') q.set('status',  filterStatus)
    if (filterFrom    && key !== 'dates')  q.set('from',    filterFrom)
    if (filterTo      && key !== 'dates')  q.set('to',      filterTo)
    if (filterQ       && key !== 'q')      q.set('q',       filterQ)
    if (filterType    && key !== 'type')   q.set('type',    filterType)
    if (filterAccount && key !== 'account') q.set('account', filterAccount)
    q.set('page', '1')
    router.push(`?${q.toString()}`)
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

  const isDraftFilter    = filterStatus === 'draft'
  const activeFilterCount = [filterFrom, filterTo, filterQ, filterType, filterAccount, filterStatus].filter(Boolean).length

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

      {/* ── 필터 패널 ──────────────────────────────── */}
      {showFilter && (
        <div className="border-b border-gray-200 bg-gray-50/70 px-4 py-3 space-y-3">
          {/* 거래일 + 유형 + 상태 */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">거래일 (시작)</label>
              <input
                type="date"
                value={localFrom}
                onChange={e => setLocalFrom(e.target.value)}
                className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <span className="text-gray-400 text-sm pb-1.5">~</span>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">거래일 (종료)</label>
              <input
                type="date"
                value={localTo}
                onChange={e => setLocalTo(e.target.value)}
                className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {/* 날짜 퀵 선택 */}
            <div className="flex items-end gap-1.5 pb-0.5">
              {(['thisMonth', 'lastMonth', 'thisYear'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setQuickDate(kind)}
                  className="h-8 px-2.5 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors font-medium whitespace-nowrap"
                >
                  {kind === 'thisMonth' ? '이번 달' : kind === 'lastMonth' ? '지난 달' : '올해'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">유형</label>
              <select
                value={localType}
                onChange={e => setLocalType(e.target.value)}
                className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">전체</option>
                {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">상태</label>
              <select
                value={localStatus}
                onChange={e => setLocalStatus(e.target.value)}
                className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">전체</option>
                <option value="draft">임시</option>
                <option value="posted">승인</option>
                <option value="reversed">역분개</option>
              </select>
            </div>
          </div>

          {/* 적요 + 계정과목 */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">적요 (LIKE 검색)</label>
              <input
                type="text"
                placeholder="적요에 포함된 단어..."
                value={localQ}
                onChange={e => setLocalQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">계정과목 (코드·명)</label>
              <input
                type="text"
                placeholder="예: 102, 임대보증금..."
                value={localAccount}
                onChange={e => setLocalAccount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} size="sm" className="h-8 text-xs">조회</Button>
              <Button onClick={handleReset} size="sm" variant="outline" className="h-8 text-xs">초기화</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 툴바 ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2">
          {/* 필터 패널 토글 */}
          <button
            onClick={() => setShowFilter(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors font-medium',
              showFilter
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            필터
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* 임시만 보기 퀵 토글 */}
          <button
            onClick={toggleDraftFilter}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors font-medium',
              isDraftFilter
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            임시만 보기
            {isDraftFilter && (
              <span className="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                {total}
              </span>
            )}
          </button>

          {/* 증빙 미확인 퀵 토글 */}
          <button
            onClick={toggleUnverifiedFilter}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors font-medium',
              filterUnverifiedOnly
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            증빙 미확인
            {filterUnverifiedOnly && (
              <span className="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                {total}
              </span>
            )}
          </button>

          {/* 활성 필터 태그 표시 */}
          {hasActiveFilter && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterStatus && filterStatus !== 'draft' && (
                <button
                  onClick={() => removeFilter('status')}
                  className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100"
                >
                  상태: {filterStatus === 'posted' ? '승인' : '역분개'}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
              {filterType && (
                <button
                  onClick={() => removeFilter('type')}
                  className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100"
                >
                  유형: {filterType}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
              {filterQ && (
                <button
                  onClick={() => removeFilter('q')}
                  className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100"
                >
                  적요: {filterQ}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
              {filterAccount && (
                <button
                  onClick={() => removeFilter('account')}
                  className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100"
                >
                  계정: {filterAccount}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
              {(filterFrom || filterTo) && (
                <button
                  onClick={() => removeFilter('dates')}
                  className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100"
                >
                  {filterFrom ?? '~'} ~ {filterTo ?? '~'}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
              <button
                onClick={handleReset}
                className="text-[11px] text-gray-400 hover:text-red-500 flex items-center gap-0.5"
              >
                <X className="w-3 h-3" /> 전체 해제
              </button>
            </div>
          )}
        </div>

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
                  {hasActiveFilter
                    ? '조회 조건에 맞는 전표가 없습니다.'
                    : isDraftFilter ? '임시 전표가 없습니다.' : '전표가 없습니다.'}
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

                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="font-mono text-xs text-gray-600">{entry.entry_number}</span>
                  </td>

                  <td className="px-3 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                    {entry.entry_date}
                  </td>

                  <td className="px-3 py-3 text-gray-800 max-w-[100px] sm:max-w-[160px] xl:max-w-[200px] truncate">
                    <Link href={`/accounting/journal/${entry.id}`} className="hover:text-blue-600 hover:underline">
                      {entry.description}
                    </Link>
                  </td>

                  <td className="px-3 py-3 hidden xl:table-cell">
                    {appliedUnit
                      ? <span className="text-xs text-gray-700 whitespace-nowrap">{appliedUnit}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>

                  <td className="px-3 py-3 hidden xl:table-cell">
                    {entry.vendor
                      ? <span className="text-xs text-gray-700 truncate max-w-[80px] block">{entry.vendor.name}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>

                  <td className="px-3 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap', typeColor)}>
                        {entry.entry_type}
                      </span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap', statusCfg.cls)}>
                        {statusCfg.label}
                      </span>
                      {(entry.evidence_type === '세금계산서' || entry.evidence_type === '현금영수증') && (
                        entry.nts_verified
                          ? <span title="국세청 확인 완료"><ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" /></span>
                          : <span title="증빙 미확인"><ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" /></span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right tabular-nums text-xs text-gray-800">
                    {formatKRW(totalDebit)}
                  </td>

                  <td className="px-3 py-3 text-right tabular-nums text-xs text-gray-800 hidden sm:table-cell">
                    {formatKRW(totalCredit)}
                  </td>

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
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* 이전 버튼 */}
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            ) : (
              <span className="w-7 h-7 flex items-center justify-center rounded text-gray-300 cursor-default">
                <ChevronLeft className="w-4 h-4" />
              </span>
            )}

            {buildPageRange(page, totalPages).map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">
                  …
                </span>
              ) : (
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
              )
            )}

            {/* 다음 버튼 */}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="w-7 h-7 flex items-center justify-center rounded text-gray-300 cursor-default">
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
