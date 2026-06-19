'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Copy, Search } from 'lucide-react'
import Link from 'next/link'

// ────────────────────────────────────────
// 타입
// ────────────────────────────────────────
interface Property {
  id: string
  name: string
  address_road: string
}

interface ExistingContract {
  id: string
  contract_number: string
  property_id: string
  contract_type: ContractType
  lessee_name: string
  lessee_phone: string | null
  lessee_email: string | null
  deposit_amount: number
  monthly_rent: number
  vat_included: boolean
  payment_due_day: number
  notes: string | null
  property?: { name: string; address_road: string }
}

type ContractType = '월세' | '전세' | '반전세'

interface FormState {
  property_id: string
  contract_type: ContractType
  contract_number: string
  lessee_name: string
  lessee_phone: string
  lessee_email: string
  deposit_amount: string
  monthly_rent: string
  vat_included: boolean
  payment_due_day: string
  start_date: string
  end_date: string
  notes: string
}

const INITIAL: FormState = {
  property_id: '',
  contract_type: '월세',
  contract_number: '',
  lessee_name: '',
  lessee_phone: '',
  lessee_email: '',
  deposit_amount: '',
  monthly_rent: '',
  vat_included: false,
  payment_due_day: '1',
  start_date: '',
  end_date: '',
  notes: '',
}

export default function NewContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyIdParam = searchParams.get('propertyId') ?? ''

  const [properties, setProperties] = useState<Property[]>([])
  const [form, setForm] = useState<FormState>({ ...INITIAL, property_id: propertyIdParam })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // ── 복사 다이얼로그 상태 ──
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyList, setCopyList] = useState<ExistingContract[]>([])
  const [copySearch, setCopySearch] = useState('')
  const [copyLoading, setCopyLoading] = useState(false)

  useEffect(() => {
    fetch('/api/properties?limit=200')
      .then(r => r.json())
      .then(json => setProperties(json.data ?? []))
      .catch(() => {})
  }, [])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // ── 기존 계약 목록 로드 & 다이얼로그 오픈 ──
  async function openCopyDialog() {
    setCopyOpen(true)
    if (copyList.length > 0) return
    setCopyLoading(true)
    try {
      const res = await fetch('/api/contracts?limit=200')
      const json = await res.json()
      setCopyList(json.data ?? [])
    } catch {
      // silent
    } finally {
      setCopyLoading(false)
    }
  }

  // ── 선택한 계약 데이터를 폼에 적용 ──
  // 계약번호·시작일·종료일은 초기화 (신규 계약에 맞게 입력 필요)
  function applyCopy(c: ExistingContract) {
    setForm({
      property_id:    c.property_id,
      contract_type:  c.contract_type,
      contract_number: '',        // 신규 번호 입력 필요
      lessee_name:    c.lessee_name,
      lessee_phone:   c.lessee_phone  ?? '',
      lessee_email:   c.lessee_email  ?? '',
      deposit_amount: String(c.deposit_amount),
      monthly_rent:   String(c.monthly_rent),
      vat_included:   c.vat_included,
      payment_due_day: String(c.payment_due_day),
      start_date:     '',         // 신규 기간 입력 필요
      end_date:       '',         // 신규 기간 입력 필요
      notes:          c.notes ?? '',
    })
    setCopyOpen(false)
    setCopySearch('')
    setError(null)
  }

  // ── 검색 필터 ──
  const filteredContracts = copyList.filter(c =>
    c.lessee_name.includes(copySearch) ||
    c.contract_number.includes(copySearch) ||
    (c.property?.name ?? '').includes(copySearch),
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setShowLoginModal(true); return }

    if (!form.property_id)          { setError('부동산을 선택해 주세요.');     return }
    if (!form.lessee_name.trim())   { setError('임차인명을 입력해 주세요.');   return }
    if (!form.start_date || !form.end_date) { setError('계약 기간을 입력해 주세요.'); return }
    if (!form.contract_number.trim()) { setError('계약 번호를 입력해 주세요.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id:     form.property_id,
          contract_type:   form.contract_type,
          contract_number: form.contract_number,
          lessee_name:     form.lessee_name,
          lessee_phone:    form.lessee_phone  || undefined,
          lessee_email:    form.lessee_email  || undefined,
          deposit_amount:  parseFloat(form.deposit_amount) || 0,
          monthly_rent:    parseFloat(form.monthly_rent)   || 0,
          vat_included:    form.vat_included,
          payment_due_day: parseInt(form.payment_due_day)  || 1,
          start_date:      form.start_date,
          end_date:        form.end_date,
          notes:           form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.formErrors?.[0] ?? json.error ?? '등록 실패')
      }
      router.push('/contracts')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const isJeonse = form.contract_type === '전세'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        description="계약을 등록하려면 로그인이 필요합니다."
      />

      {/* ── 기존 계약 복사 다이얼로그 ── */}
      <Dialog open={copyOpen} onOpenChange={open => { setCopyOpen(open); if (!open) setCopySearch('') }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>기존 계약에서 복사</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-1">
            선택한 계약의 정보를 폼에 붙여넣습니다.
            <span className="text-amber-600 ml-1">계약번호·계약기간은 초기화되니 새로 입력하세요.</span>
          </p>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="임차인명, 계약번호, 부동산명 검색..."
              value={copySearch}
              onChange={e => setCopySearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 목록 */}
          <div className="overflow-y-auto max-h-[52vh] space-y-2 pr-1">
            {copyLoading ? (
              <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
            ) : filteredContracts.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-10">
                {copySearch ? '검색 결과가 없습니다.' : '등록된 계약이 없습니다.'}
              </p>
            ) : filteredContracts.map(c => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900">{c.lessee_name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {c.contract_type}
                    </span>
                    <span className="text-xs text-gray-400">{c.contract_number}</span>
                  </div>
                  {c.property && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {c.property.name} · {c.property.address_road}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    보증금 {c.deposit_amount.toLocaleString()}원
                    {c.monthly_rent > 0 && ` · 월세 ${c.monthly_rent.toLocaleString()}원`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1"
                  onClick={() => applyCopy(c)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  복사
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/contracts">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
              뒤로
            </Button>
          </Link>
          <h2 className="text-xl font-semibold text-gray-900">새 임대계약 등록</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-gray-600"
          onClick={openCopyDialog}
        >
          <Copy className="w-3.5 h-3.5" />
          기존에서 복사
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 계약 기본 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">계약 기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>부동산 <span className="text-red-500">*</span></Label>
                <Select value={form.property_id} onValueChange={v => set('property_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="부동산 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.address_road ? ` · ${p.address_road}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>계약유형 <span className="text-red-500">*</span></Label>
                <Select
                  value={form.contract_type}
                  onValueChange={v => set('contract_type', v as ContractType)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="월세">월세</SelectItem>
                    <SelectItem value="전세">전세</SelectItem>
                    <SelectItem value="반전세">반전세</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>계약 번호 <span className="text-red-500">*</span></Label>
                <Input
                  value={form.contract_number}
                  onChange={e => set('contract_number', e.target.value)}
                  placeholder="예) 2024-001"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 임차인 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">임차인 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>임차인명 <span className="text-red-500">*</span></Label>
                <Input
                  value={form.lessee_name}
                  onChange={e => set('lessee_name', e.target.value)}
                  placeholder="홍길동"
                />
              </div>

              <div className="space-y-1.5">
                <Label>연락처</Label>
                <Input
                  value={form.lessee_phone}
                  onChange={e => set('lessee_phone', e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={form.lessee_email}
                  onChange={e => set('lessee_email', e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 금액 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">금액 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>보증금 (원)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.deposit_amount}
                  onChange={e => set('deposit_amount', e.target.value)}
                  placeholder="0"
                />
              </div>

              {!isJeonse && (
                <div className="space-y-1.5">
                  <Label>월세 (원)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.monthly_rent}
                    onChange={e => set('monthly_rent', e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              {!isJeonse && (
                <div className="space-y-1.5">
                  <Label>납부일</Label>
                  <Select value={form.payment_due_day} onValueChange={v => set('payment_due_day', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-6">
                <input
                  id="vat_included"
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  checked={form.vat_included}
                  onChange={e => set('vat_included', e.target.checked)}
                />
                <Label htmlFor="vat_included" className="cursor-pointer">부가세 포함</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 계약 기간 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">계약 기간</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>계약 시작일 <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>계약 종료일 <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 메모 */}
        <Card>
          <CardContent className="pt-5 space-y-1.5">
            <Label>메모</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="특이사항을 입력하세요."
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-md">{error}</p>
        )}

        <div className="flex justify-end gap-2 pb-6">
          <Link href="/contracts">
            <Button type="button" variant="outline">취소</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? '등록 중...' : '계약 등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}
