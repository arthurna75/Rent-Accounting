'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Store, Pencil, Trash2, CheckCircle2, XCircle, Loader2,
  LayoutGrid, List, BookOpen, ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion,
} from 'lucide-react'
import type { Vendor } from '@/types/database'

// ── 상수 ─────────────────────────────────────────────────────
const CATEGORIES = ['중개업', '공공기관', '수리업', '판매업', '기타'] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_BADGE: Record<string, string> = {
  중개업:  'bg-blue-100 text-blue-700',
  공공기관: 'bg-green-100 text-green-700',
  수리업:  'bg-orange-100 text-orange-700',
  판매업:  'bg-purple-100 text-purple-700',
  기타:    'bg-gray-100 text-gray-700',
}

const BANKS: { name: string; min: number; max: number }[] = [
  { name: 'KB국민은행',  min: 14, max: 14 },
  { name: '신한은행',    min: 11, max: 13 },
  { name: '우리은행',    min: 13, max: 13 },
  { name: '하나은행',    min: 14, max: 14 },
  { name: 'IBK기업은행', min: 15, max: 16 },
  { name: 'NH농협은행',  min: 12, max: 13 },
  { name: 'SC제일은행',  min: 11, max: 12 },
  { name: '카카오뱅크',  min: 15, max: 15 },
  { name: '토스뱅크',   min: 13, max: 13 },
  { name: '케이뱅크',   min: 11, max: 11 },
  { name: '새마을금고',  min: 12, max: 15 },
  { name: '신협',       min: 11, max: 13 },
  { name: '우체국',     min: 13, max: 14 },
  { name: '수협은행',   min: 12, max: 13 },
  { name: '부산은행',   min: 12, max: 13 },
  { name: '경남은행',   min: 12, max: 13 },
  { name: '대구은행',   min: 11, max: 13 },
  { name: '광주은행',   min: 12, max: 13 },
  { name: '전북은행',   min: 12, max: 13 },
  { name: '제주은행',   min: 11, max: 13 },
  { name: '기타',       min: 10, max: 16 },
]

type AccountStatus = 'idle' | 'valid' | 'invalid'

// ── localStorage 계좌 확인 영속성 ────────────────────────────
const LS_ACCT_KEY = 'confirmed_account_numbers_v1'

function confirmedAcctKey(bankName: string, accountNumber: string) {
  return `${bankName}__${accountNumber.replace(/\D/g, '')}`
}
function isAccountPreviouslyConfirmed(bankName: string, accountNumber: string): boolean {
  if (!bankName || !accountNumber) return false
  try {
    const raw = localStorage.getItem(LS_ACCT_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.includes(confirmedAcctKey(bankName, accountNumber))
  } catch { return false }
}
function persistAccountConfirmed(bankName: string, accountNumber: string) {
  try {
    const raw = localStorage.getItem(LS_ACCT_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    const key = confirmedAcctKey(bankName, accountNumber)
    if (!list.includes(key)) {
      list.push(key)
      localStorage.setItem(LS_ACCT_KEY, JSON.stringify(list))
    }
  } catch { /* ignore */ }
}

// ── 유틸 ─────────────────────────────────────────────────────
function validateAccountNumber(bankName: string, accountNumber: string): AccountStatus {
  const digits = accountNumber.replace(/\D/g, '')
  if (!digits) return 'idle'
  const bank = BANKS.find(b => b.name === bankName)
  const min = bank?.min ?? 10
  const max = bank?.max ?? 16
  return digits.length >= min && digits.length <= max ? 'valid' : 'invalid'
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function formatBizNum(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.startsWith('02')) {
    const d = digits.slice(0, 10)
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    const mid = d.length <= 9 ? 3 : 4
    return `${d.slice(0, 2)}-${d.slice(2, 2 + mid)}-${d.slice(2 + mid)}`
  }
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  const mid = digits.length <= 10 ? 3 : 4
  return `${digits.slice(0, 3)}-${digits.slice(3, 3 + mid)}-${digits.slice(3 + mid)}`
}

const makeEmptyForm = () => ({
  name: '',
  businessNumber: '',
  category: '기타' as Category,
  representative: '',
  phone: '',
  address: '',
  registeredAt: todayStr(),
  memo: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
})

// ── 거래내역 타입 ─────────────────────────────────────────────
interface JournalSummary {
  id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: string
  status: string
  evidence_type?: string | null
  nts_approval_number?: string | null
  nts_verified?: boolean
  lines?: {
    debit_amount: number
    credit_amount: number
    account?: { code: string; name: string } | null
  }[]
}

interface NtsVerifyResult {
  verified: boolean
  message: string
  hometax_url?: string
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export function VendorsClient({ initial }: { initial: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initial)
  const [view, setView] = useState<'card' | 'table'>('card')

  // 선택된 거래처 (상세 조회)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [vendorJournals, setVendorJournals] = useState<JournalSummary[]>([])
  const [journalsLoading, setJournalsLoading] = useState(false)
  const [ntsVerifyingId, setNtsVerifyingId] = useState<string | null>(null)
  const [ntsResults, setNtsResults] = useState<Record<string, NtsVerifyResult>>({})

  // 등록/수정 폼
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(makeEmptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountConfirmed, setAccountConfirmed] = useState(false)

  // 사업자번호 조회
  const [bizVerifying, setBizVerifying] = useState(false)
  const [bizResult, setBizResult] = useState<{
    valid: boolean; checksum: boolean; api_used: boolean
    status?: string; tax_type?: string; end_dt?: string | null; message: string
  } | null>(null)

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/vendors')
      const json = await res.json()
      setVendors(json.data ?? [])
    } catch { /* ignore */ }
  }, [])

  // ── 거래처 선택 → 상세 조회 ──────────────────────────────
  async function selectVendor(v: Vendor) {
    setSelectedVendor(v)
    setVendorJournals([])
    setNtsResults({})
    setJournalsLoading(true)
    try {
      const res = await fetch(`/api/accounting/journal-entries?vendor_id=${v.id}&limit=20`)
      const json = await res.json()
      setVendorJournals(json.data ?? [])
    } catch { /* ignore */ } finally {
      setJournalsLoading(false)
    }
  }

  function closeDetail() { setSelectedVendor(null); setVendorJournals([]); setNtsResults({}) }

  async function handleNtsVerify(je: JournalSummary) {
    if (!je.nts_approval_number) return
    setNtsVerifyingId(je.id)
    try {
      const res = await fetch('/api/nts/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journal_entry_id: je.id, approval_number: je.nts_approval_number }),
      })
      const json = await res.json()
      setNtsResults(prev => ({ ...prev, [je.id]: json }))
      // 로컬 상태도 업데이트
      setVendorJournals(prev => prev.map(j =>
        j.id === je.id ? { ...j, nts_verified: json.verified } : j,
      ))
      // 거래처 카드 미확인 건수 갱신
      await loadVendors()
    } catch {
      setNtsResults(prev => ({ ...prev, [je.id]: { verified: false, message: '네트워크 오류' } }))
    } finally {
      setNtsVerifyingId(null)
    }
  }

  // ── 폼 열기/닫기 ─────────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm(makeEmptyForm())
    setError(null)
    setAccountConfirmed(false)
    setBizResult(null)
    setShowForm(true)
  }

  function openEdit(v: Vendor) {
    closeDetail()
    setEditingId(v.id)
    setForm({
      name: v.name,
      businessNumber: v.business_number ?? '',
      category: (v.category as Category) ?? '기타',
      representative: v.representative ?? '',
      phone: v.phone ?? '',
      address: v.address ?? '',
      registeredAt: v.registered_at ?? todayStr(),
      memo: v.memo ?? '',
      bankName: v.bank_name ?? '',
      accountNumber: v.account_number ?? '',
      accountHolder: v.account_holder ?? '',
    })
    setError(null)
    // 이미 한 번 확인된 계좌번호는 확인 창 표시 안 함
    setAccountConfirmed(
      isAccountPreviouslyConfirmed(v.bank_name ?? '', v.account_number ?? '')
    )
    setBizResult(null)
    setShowForm(true)
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setError(null) }

  function setField<K extends keyof ReturnType<typeof makeEmptyForm>>(
    key: K, value: ReturnType<typeof makeEmptyForm>[K]
  ) {
    if (key === 'accountNumber' || key === 'bankName') {
      // 은행명/계좌번호가 바뀌면 → 새 조합 확인 여부 체크
      const newBank    = key === 'bankName'    ? (value as string) : form.bankName
      const newAcct    = key === 'accountNumber' ? (value as string) : form.accountNumber
      setAccountConfirmed(isAccountPreviouslyConfirmed(newBank, newAcct))
    }
    if (key === 'businessNumber') setBizResult(null)
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function confirmAccount() {
    setAccountConfirmed(true)
    persistAccountConfirmed(form.bankName, form.accountNumber)
  }

  // ── 사업자번호 조회 ───────────────────────────────────────
  async function verifyBizNumber() {
    if (!form.businessNumber.trim()) return
    setBizVerifying(true)
    setBizResult(null)
    try {
      const res = await fetch('/api/vendors/verify-biz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_number: form.businessNumber }),
      })
      setBizResult(await res.json())
    } catch {
      setBizResult({ valid: false, checksum: false, api_used: false, message: '조회 중 오류가 발생했습니다.' })
    } finally {
      setBizVerifying(false)
    }
  }

  // ── 저장 ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('거래처명을 입력해 주세요.'); return }
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        business_number: form.businessNumber.trim() || null,
        category: form.category || null,
        representative: form.representative.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        registered_at: form.registeredAt || null,
        memo: form.memo.trim() || null,
        bank_name: form.bankName.trim() || null,
        account_number: form.accountNumber.trim() || null,
        account_holder: form.accountHolder.trim() || null,
      }
      const res = await fetch(
        editingId ? `/api/vendors/${editingId}` : '/api/vendors',
        { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '오류가 발생했습니다.')
      }
      cancelForm()
      await loadVendors()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 삭제 ─────────────────────────────────────────────────
  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 거래처를 삭제하시겠습니까?`)) return
    closeDetail()
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      await loadVendors()
    } catch { alert('삭제 중 오류가 발생했습니다.') }
  }

  // ── 렌더 헬퍼 ────────────────────────────────────────────
  function VendorInfoRows({ v }: { v: Vendor }) {
    return (
      <div className="space-y-1.5">
        {v.representative && (
          <div className="flex gap-2 items-baseline">
            <span className="text-gray-400 text-xs w-14 shrink-0">대표자</span>
            <span className="text-gray-700 text-sm">{v.representative}</span>
          </div>
        )}
        {v.phone && (
          <div className="flex gap-2 items-baseline">
            <span className="text-gray-400 text-xs w-14 shrink-0">전화</span>
            <a href={`tel:${v.phone.replace(/\D/g, '')}`} className="text-blue-600 text-sm hover:underline">{v.phone}</a>
          </div>
        )}
        {v.business_number && (
          <div className="flex gap-2 items-baseline">
            <span className="text-gray-400 text-xs w-14 shrink-0">사업자</span>
            <span className="text-gray-700 text-sm font-mono">{v.business_number}</span>
          </div>
        )}
        {v.address && (
          <div className="flex gap-2 items-baseline">
            <span className="text-gray-400 text-xs w-14 shrink-0">주소</span>
            <span className="text-gray-600 text-sm">{v.address}</span>
          </div>
        )}
        {(v.bank_name || v.account_number) && (
          <div className="flex gap-2 items-baseline">
            <span className="text-gray-400 text-xs w-14 shrink-0">계좌</span>
            <span className="text-gray-700 text-sm">
              {[v.bank_name, v.account_number, v.account_holder].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
        {v.memo && (
          <div className="flex gap-2 items-baseline">
            <span className="text-gray-400 text-xs w-14 shrink-0">메모</span>
            <span className="text-gray-500 text-sm">{v.memo}</span>
          </div>
        )}
      </div>
    )
  }

  // ── 계정 확인 위젯 (폼 내부) ─────────────────────────────
  function AccountWarning() {
    const status = validateAccountNumber(form.bankName, form.accountNumber)
    const bank = BANKS.find(b => b.name === form.bankName)
    const digits = form.accountNumber.replace(/\D/g, '').length
    if (status !== 'invalid' || !bank || accountConfirmed) return null
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-1">
        <p className="text-xs text-amber-700">
          {form.bankName} 계좌번호는{' '}
          {bank.min === bank.max ? `${bank.min}자리` : `${bank.min}~${bank.max}자리`}입니다.
          입력된 자릿수는 {digits}자리입니다.
        </p>
        <p className="text-xs text-amber-700">계속 진행하시려면 확인을 클릭하십시오.</p>
        <Button
          type="button" size="sm" variant="outline"
          className="h-6 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
          onClick={confirmAccount}
        >
          확인
        </Button>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-900">거래처 관리</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* 카드/리스트 토글 */}
          <button
            onClick={() => setView('card')}
            className={`p-1.5 rounded-md transition-colors ${view === 'card' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="카드 보기"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="목록 보기"
          >
            <List className="w-4 h-4" />
          </button>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            거래처 등록
          </Button>
        </div>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-base font-semibold text-gray-800 mb-4">
              {editingId ? '거래처 수정' : '신규 거래처 등록'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="v_date">등록일자</Label>
                  <Input id="v_date" type="date" value={form.registeredAt} onChange={e => setField('registeredAt', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_category">분류</Label>
                  <Select value={form.category} onValueChange={v => setField('category', v as Category)}>
                    <SelectTrigger id="v_category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_name">거래처명 <span className="text-red-500">*</span></Label>
                  <Input id="v_name" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="예) 삼성화재, 국민은행" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_rep">대표자</Label>
                  <Input id="v_rep" value={form.representative} onChange={e => setField('representative', e.target.value)} placeholder="대표자명" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_biz">사업자번호</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="v_biz" type="text" inputMode="numeric"
                      value={form.businessNumber}
                      onChange={e => setField('businessNumber', formatBizNum(e.target.value))}
                      placeholder="000-00-00000" maxLength={12} className="flex-1"
                    />
                    <Button type="button" size="sm" variant="outline" className="shrink-0 text-xs h-9 px-2.5"
                      onClick={verifyBizNumber}
                      disabled={bizVerifying || form.businessNumber.replace(/\D/g, '').length !== 10}
                    >
                      {bizVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '조회'}
                    </Button>
                  </div>
                  {bizResult && (
                    <div className={`rounded-md border p-2 text-xs space-y-0.5 ${
                      !bizResult.checksum ? 'border-red-200 bg-red-50 text-red-700'
                        : bizResult.api_used && !bizResult.valid ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-green-200 bg-green-50 text-green-700'
                    }`}>
                      <div className="flex items-center gap-1 font-medium">
                        {!bizResult.checksum || (bizResult.api_used && !bizResult.valid)
                          ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {bizResult.message}
                      </div>
                      {bizResult.api_used && bizResult.status && (
                        <div className="text-[11px] opacity-80">
                          상태: {bizResult.status}
                          {bizResult.tax_type ? ` · ${bizResult.tax_type}` : ''}
                          {bizResult.end_dt ? ` · 폐업일: ${bizResult.end_dt}` : ''}
                        </div>
                      )}
                      {!bizResult.api_used && bizResult.checksum && (
                        <div className="text-[11px] opacity-70">
                          국세청 실시간 조회를 사용하려면 관리자에게 API 키 설정을 요청하세요.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_phone">전화</Label>
                  <Input id="v_phone" type="tel" value={form.phone} onChange={e => setField('phone', formatPhone(e.target.value))} placeholder="02-1234-5678" maxLength={13} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="v_address">주소</Label>
                  <Input id="v_address" value={form.address} onChange={e => setField('address', e.target.value)} placeholder="주소" />
                </div>

                {/* 계좌정보 */}
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">계좌정보</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="v_bank">은행명</Label>
                      <Select value={form.bankName} onValueChange={v => setField('bankName', v)}>
                        <SelectTrigger id="v_bank"><SelectValue placeholder="은행 선택" /></SelectTrigger>
                        <SelectContent>
                          {BANKS.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_acct">계좌번호</Label>
                      <div className="relative">
                        <Input
                          id="v_acct" type="text" inputMode="numeric"
                          value={form.accountNumber}
                          onChange={e => setField('accountNumber', e.target.value)}
                          placeholder="숫자만 입력" className="pr-8"
                        />
                        {(() => {
                          const st = validateAccountNumber(form.bankName, form.accountNumber)
                          if (st === 'valid' || accountConfirmed) return (
                            <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                          )
                          if (st === 'invalid') return (
                            <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                          )
                          return null
                        })()}
                      </div>
                      <AccountWarning />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_holder">예금주</Label>
                      <Input id="v_holder" value={form.accountHolder} onChange={e => setField('accountHolder', e.target.value)} placeholder="예금주명" />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="v_memo">메모</Label>
                  <Input id="v_memo" value={form.memo} onChange={e => setField('memo', e.target.value)} placeholder="비고" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelForm}>취소</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (editingId ? '수정 중...' : '등록 중...') : (editingId ? '수정' : '등록')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── 카드 뷰 ─────────────────────────────────────── */}
      {view === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Store className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>등록된 거래처가 없습니다.</p>
            </div>
          )}
          {vendors.map(v => {
            const badgeCls = CATEGORY_BADGE[v.category ?? '기타'] ?? CATEGORY_BADGE['기타']
            return (
              <button
                key={v.id}
                onClick={() => selectVendor(v)}
                className="text-left w-full rounded-xl border bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                    {v.category && (
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border border-transparent ${badgeCls}`}>
                        {v.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(v.unverified_evidence_count ?? 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        <ShieldAlert className="w-3 h-3" />
                        {v.unverified_evidence_count}
                      </span>
                    )}
                    <BookOpen className="w-4 h-4 text-gray-300 mt-0.5" />
                  </div>
                </div>
                <div className="space-y-1">
                  {v.representative && (
                    <p className="text-xs text-gray-500 truncate">대표자 {v.representative}</p>
                  )}
                  {v.phone && <p className="text-xs text-gray-500 truncate">{v.phone}</p>}
                  {v.business_number && (
                    <p className="text-xs text-gray-400 font-mono">{v.business_number}</p>
                  )}
                  {(v.bank_name || v.account_number) && (
                    <p className="text-xs text-gray-400 truncate">
                      {[v.bank_name, v.account_number].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {v.registered_at && (
                  <p className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-300">
                    등록일 {v.registered_at}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── 테이블 뷰 ────────────────────────────────────── */}
      {view === 'table' && (
        <Card>
          <CardContent className="p-0">
            {vendors.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Store className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>등록된 거래처가 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>거래처명</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead className="hidden md:table-cell">대표자</TableHead>
                    <TableHead className="hidden md:table-cell">전화</TableHead>
                    <TableHead className="hidden lg:table-cell">사업자번호</TableHead>
                    <TableHead className="hidden lg:table-cell">계좌</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map(v => {
                    const badgeCls = CATEGORY_BADGE[v.category ?? '기타'] ?? CATEGORY_BADGE['기타']
                    return (
                      <TableRow
                        key={v.id}
                        onClick={() => selectVendor(v)}
                        className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                      >
                        <TableCell className="font-medium text-gray-900">{v.name}</TableCell>
                        <TableCell>
                          {v.category && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`}>
                              {v.category}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 hidden md:table-cell">
                          {v.representative ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 hidden md:table-cell">
                          {v.phone ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-500 hidden lg:table-cell">
                          {v.business_number ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 hidden lg:table-cell">
                          {v.bank_name ? `${v.bank_name} ${v.account_number ?? ''}`.trim() : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 상세 조회 Dialog ─────────────────────────────── */}
      <Dialog open={!!selectedVendor} onOpenChange={open => { if (!open) closeDetail() }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedVendor && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg">{selectedVendor.name}</DialogTitle>
                  {selectedVendor.category && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_BADGE[selectedVendor.category] ?? CATEGORY_BADGE['기타']}`}>
                      {selectedVendor.category}
                    </span>
                  )}
                </div>
              </DialogHeader>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 pt-1 pb-3 border-b">
                <Link href={`/accounting/journal/new?vendor_id=${selectedVendor.id}`}>
                  <Button size="sm" className="gap-1.5 h-8">
                    <Plus className="w-3.5 h-3.5" />
                    전표 등록
                  </Button>
                </Link>
                <Button
                  size="sm" variant="outline" className="gap-1.5 h-8"
                  onClick={() => openEdit(selectedVendor)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  수정
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5 h-8 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={() => handleDelete(selectedVendor.id, selectedVendor.name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </Button>
              </div>

              {/* 기본 정보 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">기본 정보</h3>
                <VendorInfoRows v={selectedVendor} />
                {selectedVendor.registered_at && (
                  <p className="text-xs text-gray-400">등록일 {selectedVendor.registered_at}</p>
                )}
              </div>

              {/* 거래 내역 */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">거래 내역</h3>
                  <Link
                    href={`/accounting/journal?vendor_id=${selectedVendor.id}`}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    분개장에서 전체 보기
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {journalsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    불러오는 중...
                  </div>
                ) : vendorJournals.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">등록된 거래 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-1.5">
                    {vendorJournals.map(je => {
                      const totalAmt = (je.lines ?? []).reduce(
                        (s, l) => s + Math.max(l.debit_amount, l.credit_amount), 0
                      )
                      const needsNts = je.evidence_type === '세금계산서' || je.evidence_type === '현금영수증'
                      const isVerifying = ntsVerifyingId === je.id
                      const ntsResult = ntsResults[je.id]
                      const isVerified = ntsResult ? ntsResult.verified : (je.nts_verified ?? false)
                      return (
                        <div key={je.id} className="rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                          <Link href={`/accounting/journal/${je.id}`}>
                            <div className="flex items-center justify-between gap-3 p-2.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-900 truncate">{je.description}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">{je.entry_type}</span>
                                  {needsNts && (
                                    isVerified
                                      ? <span className="flex items-center gap-0.5 text-xs text-green-600 shrink-0"><ShieldCheck className="w-3 h-3" />{je.evidence_type}</span>
                                      : <span className="flex items-center gap-0.5 text-xs text-amber-600 shrink-0"><ShieldAlert className="w-3 h-3" />{je.evidence_type} 미확인</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{je.entry_number} · {je.entry_date}</p>
                              </div>
                              {totalAmt > 0 && (
                                <span className="text-sm font-semibold text-gray-700 shrink-0 tabular-nums">
                                  {totalAmt.toLocaleString('ko-KR')}원
                                </span>
                              )}
                            </div>
                          </Link>
                          {/* 승인번호 있고 미확인인 경우 확인 버튼 표시 */}
                          {needsNts && je.nts_approval_number && !isVerified && (
                            <div className="px-2.5 pb-2 flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-mono truncate">{je.nts_approval_number}</span>
                              <button
                                type="button"
                                onClick={() => handleNtsVerify(je)}
                                disabled={isVerifying}
                                className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              >
                                {isVerifying
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <ShieldQuestion className="w-3 h-3" />
                                }
                                국세청 확인
                              </button>
                            </div>
                          )}
                          {/* 확인 결과 표시 */}
                          {ntsResult && (
                            <div className={`mx-2.5 mb-2 rounded px-2 py-1 text-xs flex items-center gap-1.5 ${ntsResult.verified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                              {ntsResult.verified ? <ShieldCheck className="w-3 h-3 shrink-0" /> : <ShieldAlert className="w-3 h-3 shrink-0" />}
                              <span>{ntsResult.message}</span>
                              {ntsResult.hometax_url && (
                                <a href={ntsResult.hometax_url} target="_blank" rel="noopener noreferrer" className="ml-auto underline text-blue-600">
                                  홈택스 →
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
