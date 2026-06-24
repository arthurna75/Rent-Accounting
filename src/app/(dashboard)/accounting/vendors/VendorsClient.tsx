'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Store, Pencil, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { Vendor } from '@/types/database'

const CATEGORIES = ['중개업', '공공기관', '수리업', '판매업', '기타'] as const
type Category = (typeof CATEGORIES)[number]

// 주요 은행 목록 + 계좌번호 유효 자릿수 범위
const BANKS: { name: string; min: number; max: number }[] = [
  { name: 'KB국민은행',   min: 14, max: 14 },
  { name: '신한은행',     min: 11, max: 13 },
  { name: '우리은행',     min: 13, max: 13 },
  { name: '하나은행',     min: 14, max: 14 },
  { name: 'IBK기업은행',  min: 15, max: 16 },
  { name: 'NH농협은행',   min: 12, max: 13 },
  { name: 'SC제일은행',   min: 11, max: 12 },
  { name: '카카오뱅크',   min: 15, max: 15 },
  { name: '토스뱅크',     min: 13, max: 13 },
  { name: '케이뱅크',     min: 11, max: 11 },
  { name: '새마을금고',   min: 12, max: 15 },
  { name: '신협',         min: 11, max: 13 },
  { name: '우체국',       min: 13, max: 14 },
  { name: '수협은행',     min: 12, max: 13 },
  { name: '부산은행',     min: 12, max: 13 },
  { name: '경남은행',     min: 12, max: 13 },
  { name: '대구은행',     min: 11, max: 13 },
  { name: '광주은행',     min: 12, max: 13 },
  { name: '전북은행',     min: 12, max: 13 },
  { name: '제주은행',     min: 11, max: 13 },
  { name: '기타',         min: 10, max: 16 },
]

type AccountStatus = 'idle' | 'valid' | 'invalid'

function validateAccountNumber(bankName: string, accountNumber: string): AccountStatus {
  const digits = accountNumber.replace(/\D/g, '')
  if (!digits) return 'idle'
  const bank = BANKS.find(b => b.name === bankName)
  const min = bank?.min ?? 10
  const max = bank?.max ?? 16
  return digits.length >= min && digits.length <= max ? 'valid' : 'invalid'
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

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

export function VendorsClient({ initial }: { initial: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(makeEmptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountConfirmed, setAccountConfirmed] = useState(false)
  const [bizVerifying, setBizVerifying] = useState(false)
  const [bizResult, setBizResult] = useState<{
    valid: boolean
    checksum: boolean
    api_used: boolean
    status?: string
    tax_type?: string
    end_dt?: string | null
    message: string
  } | null>(null)

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/vendors')
      const json = await res.json()
      setVendors(json.data ?? [])
    } catch { /* ignore */ }
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(makeEmptyForm())
    setError(null)
    setAccountConfirmed(false)
    setBizResult(null)
    setShowForm(true)
  }

  function openEdit(v: Vendor) {
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
    setAccountConfirmed(false)
    setBizResult(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  function setField<K extends keyof ReturnType<typeof makeEmptyForm>>(
    key: K,
    value: ReturnType<typeof makeEmptyForm>[K]
  ) {
    if (key === 'accountNumber' || key === 'bankName') setAccountConfirmed(false)
    if (key === 'businessNumber') setBizResult(null)
    setForm(prev => ({ ...prev, [key]: value }))
  }

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
      const json = await res.json()
      setBizResult(json)
    } catch {
      setBizResult({ valid: false, checksum: false, api_used: false, message: '조회 중 오류가 발생했습니다.' })
    } finally {
      setBizVerifying(false)
    }
  }

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
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 거래처를 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      await loadVendors()
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-900">거래처 관리</h2>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          거래처 등록
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editingId ? '거래처 수정' : '신규 거래처 등록'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="v_date">등록일자</Label>
                  <Input
                    id="v_date"
                    type="date"
                    value={form.registeredAt}
                    onChange={e => setField('registeredAt', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_category">분류</Label>
                  <Select
                    value={form.category}
                    onValueChange={v => setField('category', v as Category)}
                  >
                    <SelectTrigger id="v_category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_name">거래처명 <span className="text-red-500">*</span></Label>
                  <Input
                    id="v_name"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="예) 삼성화재, 국민은행"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_rep">대표자</Label>
                  <Input
                    id="v_rep"
                    value={form.representative}
                    onChange={e => setField('representative', e.target.value)}
                    placeholder="대표자명"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_biz">사업자번호</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="v_biz"
                      type="text"
                      inputMode="numeric"
                      value={form.businessNumber}
                      onChange={e => setField('businessNumber', formatBizNum(e.target.value))}
                      placeholder="000-00-00000"
                      maxLength={12}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs h-9 px-2.5"
                      onClick={verifyBizNumber}
                      disabled={bizVerifying || form.businessNumber.replace(/\D/g, '').length !== 10}
                    >
                      {bizVerifying
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : '조회'}
                    </Button>
                  </div>
                  {bizResult && (
                    <div className={`rounded-md border p-2 text-xs space-y-0.5 ${
                      !bizResult.checksum
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : bizResult.api_used && !bizResult.valid
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-green-200 bg-green-50 text-green-700'
                    }`}>
                      <div className="flex items-center gap-1 font-medium">
                        {!bizResult.checksum || (bizResult.api_used && !bizResult.valid)
                          ? <XCircle className="w-3.5 h-3.5" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />}
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
                  <Input
                    id="v_phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => setField('phone', formatPhone(e.target.value))}
                    placeholder="02-1234-5678"
                    maxLength={13}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="v_address">주소</Label>
                  <Input
                    id="v_address"
                    value={form.address}
                    onChange={e => setField('address', e.target.value)}
                    placeholder="주소"
                  />
                </div>

                {/* 계좌정보 */}
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">계좌정보</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="v_bank">은행명</Label>
                      <Select value={form.bankName} onValueChange={v => setField('bankName', v)}>
                        <SelectTrigger id="v_bank">
                          <SelectValue placeholder="은행 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {BANKS.map(b => (
                            <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_acct">계좌번호</Label>
                      <div className="relative">
                        <Input
                          id="v_acct"
                          type="text"
                          inputMode="numeric"
                          value={form.accountNumber}
                          onChange={e => setField('accountNumber', e.target.value)}
                          placeholder="숫자만 입력"
                          className="pr-8"
                        />
                        {(() => {
                          const status = validateAccountNumber(form.bankName, form.accountNumber)
                          if (status === 'valid' || accountConfirmed) return (
                            <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                          )
                          if (status === 'invalid') return (
                            <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                          )
                          return null
                        })()}
                      </div>
                      {(() => {
                        const status = validateAccountNumber(form.bankName, form.accountNumber)
                        const bank = BANKS.find(b => b.name === form.bankName)
                        const digits = form.accountNumber.replace(/\D/g, '').length
                        if (status === 'invalid' && bank && !accountConfirmed) return (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-1">
                            <p className="text-xs text-amber-700">
                              {form.bankName} 계좌번호는 {bank.min === bank.max ? `${bank.min}자리` : `${bank.min}~${bank.max}자리`}입니다.
                              입력된 자릿수는 {digits}자리입니다.
                            </p>
                            <p className="text-xs text-amber-700">계속 진행하시려면 확인을 클릭하십시오.</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                              onClick={() => setAccountConfirmed(true)}
                            >
                              확인
                            </Button>
                          </div>
                        )
                        return null
                      })()}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_holder">예금주</Label>
                      <Input
                        id="v_holder"
                        value={form.accountHolder}
                        onChange={e => setField('accountHolder', e.target.value)}
                        placeholder="예금주명"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="v_memo">메모</Label>
                  <Input
                    id="v_memo"
                    value={form.memo}
                    onChange={e => setField('memo', e.target.value)}
                    placeholder="비고"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelForm}>취소</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? (editingId ? '수정 중...' : '등록 중...')
                    : (editingId ? '수정' : '등록')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {vendors.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Store className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>등록된 거래처가 없습니다.</p>
          </div>
        )}
        {vendors.map(v => (
          <Card key={v.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {/* 헤더: 거래처명 + 분류 배지 + 수정/삭제 */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                  {v.category && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {v.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                    onClick={() => openEdit(v)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(v.id, v.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* 정보 행 */}
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
                    <a
                      href={`tel:${v.phone.replace(/\D/g, '')}`}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      {v.phone}
                    </a>
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
                    <span className="text-gray-600 text-sm truncate">{v.address}</span>
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
                    <span className="text-gray-500 text-sm truncate">{v.memo}</span>
                  </div>
                )}
              </div>

              {/* 등록일 */}
              {v.registered_at && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  등록일 {v.registered_at}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
