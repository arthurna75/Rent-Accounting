'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatKRW } from '@/lib/utils/format'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, CheckCircle2, Loader2, X, ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck, Bookmark } from 'lucide-react'

type EntryStatus = 'draft' | 'posted' | 'reversed'
type EntryType = string
type AccountType = '자산' | '부채' | '자본' | '수익' | '비용'

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

interface VendorOption { id: string; name: string }
interface ContractOption { id: string; label: string }
interface AccountOption { id: string; code: string; name: string; account_type: AccountType }

interface FilterPreset {
  id: string
  name: string
  filters: {
    from?: string; to?: string; q?: string; type?: string; status?: string
    vendorId?: string; contractId?: string; accountType?: string; accountId?: string
  }
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
  filterAccountType?: string
  filterAccountId?: string
  filterVendorId?: string
  filterContractId?: string
  filterUnverifiedOnly?: boolean
  vendors: VendorOption[]
  contracts: ContractOption[]
  accounts: AccountOption[]
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

const ACCOUNT_TYPES: AccountType[] = ['자산', '부채', '자본', '수익', '비용']

const PRESET_STORAGE_KEY = 'journal_filter_presets'

function loadPresets(): FilterPreset[] {
  try {
    return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function savePresets(presets: FilterPreset[]) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
}

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

function getAccountNames(entry: JournalEntryRow): string {
  const names = entry.lines
    .map(l => l.account?.name)
    .filter(Boolean) as string[]
  const unique = [...new Set(names)]
  if (unique.length === 0) return ''
  if (unique.length <= 2) return unique.join(' / ')
  return `${unique[0]} / ${unique[1]} +${unique.length - 2}`
}

export function JournalLedgerTable({
  entries, page, totalPages, total,
  filterStatus, filterFrom, filterTo, filterQ, filterType,
  filterAccountType, filterAccountId, filterVendorId, filterContractId,
  filterUnverifiedOnly,
  vendors, contracts, accounts,
}: Props) {
  const router = useRouter()

  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)

  // 로컬 필터 상태
  const [localFrom,        setLocalFrom]        = useState(filterFrom        ?? '')
  const [localTo,          setLocalTo]          = useState(filterTo          ?? '')
  const [localQ,           setLocalQ]           = useState(filterQ           ?? '')
  const [localType,        setLocalType]        = useState(filterType        ?? '')
  const [localStatus,      setLocalStatus]      = useState(filterStatus      ?? '')
  const [localAccountType, setLocalAccountType] = useState(filterAccountType ?? '')
  const [localAccountId,   setLocalAccountId]   = useState(filterAccountId   ?? '')
  const [localVendorId,    setLocalVendorId]    = useState(filterVendorId    ?? '')
  const [localContractId,  setLocalContractId]  = useState(filterContractId  ?? '')

  // 변형(preset) 관련
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [showPresetSave, setShowPresetSave] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')

  useEffect(() => {
    setPresets(loadPresets())
  }, [])

  const draftEntries     = entries.filter(e => e.status === 'draft')
  const allDraftSelected = draftEntries.length > 0 && draftEntries.every(e => selectedIds.has(e.id))

  // 현재 유형에 따른 계정과목 목록
  const filteredAccounts = localAccountType
    ? accounts.filter(a => a.account_type === localAccountType)
    : accounts

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

  function buildUrl(opts: {
    status?: string; from?: string; to?: string; q?: string; type?: string
    accountType?: string; accountId?: string; vendorId?: string; contractId?: string
    unverified?: boolean; page?: number
  } = {}) {
    const q = new URLSearchParams()
    const s    = opts.status      !== undefined ? opts.status      : localStatus
    const frm  = opts.from        !== undefined ? opts.from        : localFrom
    const to   = opts.to          !== undefined ? opts.to          : localTo
    const sq   = opts.q           !== undefined ? opts.q           : localQ
    const typ  = opts.type        !== undefined ? opts.type        : localType
    const aTyp = opts.accountType !== undefined ? opts.accountType : localAccountType
    const aId  = opts.accountId   !== undefined ? opts.accountId   : localAccountId
    const vId  = opts.vendorId    !== undefined ? opts.vendorId    : localVendorId
    const cId  = opts.contractId  !== undefined ? opts.contractId  : localContractId
    const pg   = opts.page        !== undefined ? opts.page        : 1

    if (s)    q.set('status',       s)
    if (frm)  q.set('from',         frm)
    if (to)   q.set('to',           to)
    if (sq)   q.set('q',            sq)
    if (typ)  q.set('type',         typ)
    if (aTyp) q.set('account_type', aTyp)
    if (aId)  q.set('account_id',   aId)
    if (vId)  q.set('vendor_id',    vId)
    if (cId)  q.set('contract_id',  cId)
    const unv = opts.unverified !== undefined ? opts.unverified : filterUnverifiedOnly
    if (unv) q.set('unverified', '1')
    q.set('page', String(pg))
    return `?${q.toString()}`
  }

  function handleSearch() {
    setSelectedIds(new Set())
    router.push(buildUrl())
  }

  function handleReset() {
    setLocalFrom(''); setLocalTo(''); setLocalQ('')
    setLocalType(''); setLocalStatus(''); setLocalAccountType('')
    setLocalAccountId(''); setLocalVendorId(''); setLocalContractId('')
    setSelectedIds(new Set())
    setSelectedPresetId('')
    router.push('?page=1')
  }

  function toggleUnverifiedFilter() {
    const next = !filterUnverifiedOnly
    setSelectedIds(new Set())
    router.push(buildUrl({ unverified: next, page: 1 }))
  }

  function toggleDraftFilter() {
    const next = filterStatus !== 'draft' ? 'draft' : ''
    setLocalStatus(next)
    setSelectedIds(new Set())
    router.push(buildUrl({ status: next }))
  }

  function pageHref(p: number) {
    return buildUrl({
      status: filterStatus, from: filterFrom, to: filterTo,
      q: filterQ, type: filterType,
      accountType: filterAccountType, accountId: filterAccountId,
      vendorId: filterVendorId, contractId: filterContractId, page: p,
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

  function handleAccountTypeChange(value: string) {
    setLocalAccountType(value)
    setLocalAccountId('') // 유형 변경 시 계정 초기화
  }

  // 변형 저장
  function handleSavePreset() {
    if (!presetName.trim()) return
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name: presetName.trim(),
      filters: {
        from: localFrom || undefined,
        to: localTo || undefined,
        q: localQ || undefined,
        type: localType || undefined,
        status: localStatus || undefined,
        vendorId: localVendorId || undefined,
        contractId: localContractId || undefined,
        accountType: localAccountType || undefined,
        accountId: localAccountId || undefined,
      },
    }
    const next = [...presets, preset]
    setPresets(next)
    savePresets(next)
    setPresetName('')
    setShowPresetSave(false)
  }

  // 변형 적용
  function handleApplyPreset(id: string) {
    const preset = presets.find(p => p.id === id)
    if (!preset) return
    const f = preset.filters
    setLocalFrom(f.from ?? '')
    setLocalTo(f.to ?? '')
    setLocalQ(f.q ?? '')
    setLocalType(f.type ?? '')
    setLocalStatus(f.status ?? '')
    setLocalVendorId(f.vendorId ?? '')
    setLocalContractId(f.contractId ?? '')
    setLocalAccountType(f.accountType ?? '')
    setLocalAccountId(f.accountId ?? '')
    setSelectedIds(new Set())
    router.push(buildUrl({
      from: f.from, to: f.to, q: f.q, type: f.type, status: f.status,
      vendorId: f.vendorId, contractId: f.contractId,
      accountType: f.accountType, accountId: f.accountId, page: 1,
    }))
  }

  // 변형 삭제
  function handleDeletePreset(id: string) {
    const next = presets.filter(p => p.id !== id)
    setPresets(next)
    savePresets(next)
    if (selectedPresetId === id) setSelectedPresetId('')
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
  const hasActiveFilter = !!(filterFrom || filterTo || filterQ || filterType || filterAccountType || filterAccountId || filterVendorId || filterContractId || filterStatus)
  const activeFilterCount = [filterFrom || filterTo, filterQ, filterType, filterAccountType || filterAccountId, filterVendorId, filterContractId, filterStatus].filter(Boolean).length

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

      {/* ── 필터 패널 (항상 표시) ─────────────────────────────── */}
      <div className="border-b border-gray-200 bg-gray-50/70 px-4 py-3 space-y-3">

        {/* 행 1: 거래일 + 유형 + 상태 */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">거래일 시작</label>
            <input
              type="date"
              value={localFrom}
              onChange={e => setLocalFrom(e.target.value)}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <span className="text-gray-400 text-sm pb-1.5">~</span>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">거래일 종료</label>
            <input
              type="date"
              value={localTo}
              onChange={e => setLocalTo(e.target.value)}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
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

        {/* 행 2: 계정과목(2단계) + 거래처 + 적용호수 */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">계정 유형</label>
            <select
              value={localAccountType}
              onChange={e => handleAccountTypeChange(e.target.value)}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">전체</option>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">계정과목</label>
            <select
              value={localAccountId}
              onChange={e => setLocalAccountId(e.target.value)}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{localAccountType ? `${localAccountType} 전체` : '전체'}</option>
              {filteredAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">거래처</label>
            <select
              value={localVendorId}
              onChange={e => setLocalVendorId(e.target.value)}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">전체</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">적용호수</label>
            <select
              value={localContractId}
              onChange={e => setLocalContractId(e.target.value)}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">전체</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">적요</label>
            <input
              type="text"
              placeholder="적요에 포함된 단어..."
              value={localQ}
              onChange={e => setLocalQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} size="sm" className="h-8 text-xs">조회</Button>
            <Button onClick={handleReset} size="sm" variant="outline" className="h-8 text-xs">초기화</Button>
          </div>
        </div>

        {/* 행 3: 변형(preset) 저장/불러오기 */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-200">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            <Bookmark className="w-3 h-3 inline mr-1" />변형
          </span>

          {/* 저장된 변형 목록 */}
          {presets.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {presets.map(p => (
                <div key={p.id} className="flex items-center gap-0">
                  <button
                    onClick={() => { setSelectedPresetId(p.id); handleApplyPreset(p.id) }}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-l-md border transition-colors font-medium',
                      selectedPresetId === p.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50',
                    )}
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => handleDeletePreset(p.id)}
                    className={cn(
                      'text-[11px] px-1.5 py-1 rounded-r-md border-t border-b border-r transition-colors',
                      selectedPresetId === p.id
                        ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-700'
                        : 'bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:bg-red-50',
                    )}
                    title="변형 삭제"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 변형 저장 폼 */}
          {showPresetSave ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="변형 이름..."
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowPresetSave(false) }}
                autoFocus
                className="h-7 w-36 rounded-md border border-blue-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <Button onClick={handleSavePreset} size="sm" className="h-7 text-xs px-2">저장</Button>
              <button
                onClick={() => { setShowPresetSave(false); setPresetName('') }}
                className="text-xs text-gray-400 hover:text-gray-600 px-1"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPresetSave(true)}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              + 현재 필터를 변형으로 저장
            </button>
          )}
        </div>
      </div>

      {/* ── 툴바 ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* 활성 필터 태그 */}
          {hasActiveFilter && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterStatus && filterStatus !== 'draft' && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  상태: {filterStatus === 'posted' ? '승인' : '역분개'}
                </span>
              )}
              {filterType && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  유형: {filterType}
                </span>
              )}
              {filterQ && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  적요: {filterQ}
                </span>
              )}
              {filterAccountType && !filterAccountId && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  계정유형: {filterAccountType}
                </span>
              )}
              {filterAccountId && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  계정: {accounts.find(a => a.id === filterAccountId)?.name ?? filterAccountId}
                </span>
              )}
              {filterVendorId && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  거래처: {vendors.find(v => v.id === filterVendorId)?.name ?? filterVendorId}
                </span>
              )}
              {filterContractId && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  호수: {contracts.find(c => c.id === filterContractId)?.label ?? filterContractId}
                </span>
              )}
              {(filterFrom || filterTo) && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  {filterFrom ?? '~'} ~ {filterTo ?? '~'}
                </span>
              )}
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
              <th className="text-left px-3 py-3 font-medium text-gray-600">적요 / 계정과목</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-32 hidden lg:table-cell">적용호수</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-24 hidden lg:table-cell">거래처</th>
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
              const accountNames = getAccountNames(entry)

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

                  {/* 적요 + 계정과목명 서브텍스트 */}
                  <td className="px-3 py-3 max-w-[120px] sm:max-w-[180px] xl:max-w-[240px]">
                    <Link href={`/accounting/journal/${entry.id}`} className="hover:text-blue-600 hover:underline text-gray-800 block truncate">
                      {entry.description}
                    </Link>
                    {accountNames && (
                      <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                        {accountNames}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 hidden lg:table-cell">
                    {appliedUnit
                      ? <span className="text-xs text-gray-700 whitespace-nowrap">{appliedUnit}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>

                  <td className="px-3 py-3 hidden lg:table-cell">
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
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </Link>
            ) : (
              <span className="w-7 h-7 flex items-center justify-center rounded text-gray-300 cursor-default">
                <ChevronLeft className="w-4 h-4" />
              </span>
            )}

            {buildPageRange(page, totalPages).map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
              ) : (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={cn(
                    'w-7 h-7 flex items-center justify-center rounded text-xs font-medium',
                    p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  {p}
                </Link>
              )
            )}

            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100">
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
