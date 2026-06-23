'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Lock } from 'lucide-react'
import { AttachmentPanel } from '@/components/ui/AttachmentPanel'

// ────────────────────────────────────────
// 타입
// ────────────────────────────────────────
interface Vendor {
  id: string
  name: string
  business_number: string | null
}

interface Property {
  id: string
  building_name: string
  unit_number: string
  address_road: string | null
}

interface LeaseContract {
  id: string
  property_id: string
  lessee_name: string
  lessee_phone: string | null
  lessee_email: string | null
  lessee_id_number: string | null
  contract_type: string
  contract_number: string
  contract_date: string | null
  deposit_amount: number
  monthly_rent: number
  monthly_management_fee: number | null
  vat_included: boolean
  payment_due_day: number
  start_date: string
  end_date: string
  notes: string | null
  special_terms: string | null
  attachment_urls: string[] | null
  broker_vendor_id?: string | null
  broker_fee?: number | null
  auto_journal_broker?: boolean
  auto_journal_deposit?: boolean
}

// ────────────────────────────────────────
// 숫자 포맷 유틸
// ────────────────────────────────────────
function digits(v: string) { return v.replace(/[^0-9]/g, '') }
function commaFmt(v: string) {
  const n = parseInt(digits(v), 10)
  return isNaN(n) ? '' : n.toLocaleString('ko-KR')
}

// ────────────────────────────────────────
// 잠금 필드 표시용 컴포넌트
// ────────────────────────────────────────
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-gray-500">
        <Lock className="w-3 h-3" />
        {label}
      </Label>
      <div className="h-9 px-3 flex items-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-600">
        {value || '—'}
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// 메인 폼
// ────────────────────────────────────────
export default function ContractEditForm({
  contract,
  properties,
}: {
  contract: LeaseContract
  properties: Property[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>(contract.attachment_urls ?? [])
  const [vendors, setVendors] = useState<Vendor[]>([])

  useEffect(() => {
    fetch('/api/vendors?limit=200')
      .then(r => r.json())
      .then(json => setVendors(json.data ?? []))
      .catch(() => {})
  }, [])

  const [idFront, idBack] = (contract.lessee_id_number ?? '').split('-')

  const [form, setForm] = useState({
    property_id:            contract.property_id,
    lessee_name:            contract.lessee_name,
    lessee_phone:           contract.lessee_phone ?? '',
    lessee_email:           contract.lessee_email ?? '',
    lessee_id_front:        idFront ?? '',
    lessee_id_back:         idBack ?? '',
    contract_type:          contract.contract_type,
    contract_date:          contract.contract_date ?? '',
    start_date:             contract.start_date,
    end_date:               contract.end_date,
    deposit_amount:         contract.deposit_amount.toString(),
    monthly_rent:           contract.monthly_rent.toString(),
    monthly_management_fee: contract.monthly_management_fee?.toString() ?? '',
    payment_due_day:        contract.payment_due_day.toString(),
    vat_included:           contract.vat_included,
    notes:                  contract.notes ?? '',
    special_terms:          contract.special_terms ?? '',
    broker_vendor_id:       contract.broker_vendor_id ?? '',
    broker_fee:             contract.broker_fee?.toString() ?? '',
    auto_journal_broker:    contract.auto_journal_broker ?? false,
    auto_journal_deposit:   contract.auto_journal_deposit ?? false,
  })

  const setStr = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))
  const setBool = (key: string, value: boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // 건물명 고정 (현재 부동산 기준)
  const originalProp = properties.find(p => p.id === contract.property_id)
  const buildingName = originalProp?.building_name ?? ''

  // 같은 건물의 호실 목록 (자연 정렬)
  const sameBuilding = useMemo(() =>
    properties
      .filter(p => p.building_name === buildingName)
      .sort((a, b) => a.unit_number.localeCompare(b.unit_number, 'ko', { numeric: true })),
    [properties, buildingName],
  )

  const isJeonse = form.contract_type === '전세'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setShowLoginModal(true); return }

    if (!form.lessee_name.trim()) { setError('임차인명을 입력해 주세요.'); return }
    if (!form.end_date)           { setError('계약 종료일을 입력해 주세요.'); return }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        property_id:            form.property_id,
        lessee_name:            form.lessee_name,
        lessee_phone:           form.lessee_phone || null,
        lessee_email:           form.lessee_email || null,
        lessee_id_number:       form.lessee_id_front
                                  ? `${form.lessee_id_front}-${form.lessee_id_back}`
                                  : null,
        contract_type:          form.contract_type,
        contract_date:          form.contract_date || null,
        start_date:             form.start_date,
        end_date:               form.end_date,
        deposit_amount:         parseInt(digits(form.deposit_amount), 10) || 0,
        monthly_rent:           isJeonse ? 0 : (parseInt(digits(form.monthly_rent), 10) || 0),
        monthly_management_fee: isJeonse || !form.monthly_management_fee
                                  ? null
                                  : (parseInt(digits(form.monthly_management_fee), 10) || 0),
        payment_due_day:        parseInt(form.payment_due_day) || 1,
        vat_included:           form.vat_included,
        notes:                  form.notes || null,
        special_terms:          form.special_terms || null,
        attachment_urls:        attachmentUrls.length > 0 ? attachmentUrls : null,
        broker_vendor_id:       form.broker_vendor_id || null,
        broker_fee:             form.broker_fee ? (parseInt(digits(form.broker_fee), 10) || 0) : null,
        auto_journal_broker:    form.auto_journal_broker,
        auto_journal_deposit:   form.auto_journal_deposit,
      }

      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '수정에 실패했습니다.')
      }
      router.push(`/contracts/${contract.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        description="계약 정보를 수정하려면 로그인이 필요합니다."
      />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/contracts/${contract.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            계약 상세
          </Link>
        </Button>
        <h2 className="text-xl font-semibold text-gray-900">계약 수정</h2>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Lock className="w-3 h-3" /> 아이콘 항목은 변경 불가 (건물명·계약번호)
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 부동산 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">부동산</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 건물명: 잠금 */}
              <LockedField label="건물명" value={buildingName} />

              {/* 호실: 같은 건물 내에서 변경 가능 */}
              <div className="space-y-1.5">
                <Label>호실</Label>
                <Select value={form.property_id} onValueChange={v => setStr('property_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="호실 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sameBuilding.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.unit_number || '(단일 호실)'}
                        {p.address_road ? ` · ${p.address_road}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 계약 기본 정보 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">계약 기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 계약유형 */}
              <div className="space-y-1.5">
                <Label>계약유형</Label>
                <Select value={form.contract_type} onValueChange={v => setStr('contract_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="월세">월세</SelectItem>
                    <SelectItem value="전세">전세</SelectItem>
                    <SelectItem value="반전세">반전세</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 계약번호: 잠금 */}
              <LockedField label="계약번호" value={contract.contract_number} />

              {/* 계약일자 */}
              <div className="space-y-1.5">
                <Label htmlFor="contract_date">계약일자</Label>
                <Input
                  id="contract_date"
                  type="date"
                  value={form.contract_date}
                  onChange={e => setStr('contract_date', e.target.value)}
                />
              </div>

              {/* 임대기간 — 한 행에 시작~종료 */}
              <div className="col-span-2 space-y-1.5">
                <Label>임대기간 <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={e => setStr('start_date', e.target.value)}
                    className="flex-1"
                    required
                  />
                  <span className="text-gray-400 shrink-0">~</span>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={e => setStr('end_date', e.target.value)}
                    className="flex-1"
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 임차인 정보 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">임차인 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="lessee_name">임차인명 <span className="text-red-500">*</span></Label>
                <Input
                  id="lessee_name"
                  value={form.lessee_name}
                  onChange={e => setStr('lessee_name', e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lessee_phone">연락처</Label>
                <Input
                  id="lessee_phone"
                  value={form.lessee_phone}
                  onChange={e => setStr('lessee_phone', e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lessee_email">이메일</Label>
                <Input
                  id="lessee_email"
                  type="email"
                  value={form.lessee_email}
                  onChange={e => setStr('lessee_email', e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
              {/* 주민번호 */}
              <div className="col-span-2 space-y-1.5">
                <Label>주민번호</Label>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-32 tabular-nums"
                    maxLength={6}
                    value={form.lessee_id_front}
                    onChange={e => setStr('lessee_id_front', digits(e.target.value).slice(0, 6))}
                    placeholder="앞 6자리"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    className="w-16 tabular-nums"
                    maxLength={1}
                    value={form.lessee_id_back}
                    onChange={e => setStr('lessee_id_back', digits(e.target.value).slice(0, 1))}
                    placeholder="1"
                  />
                  <span className="text-sm text-gray-400">●●●●●●</span>
                  <span className="text-xs text-gray-400 ml-1">(뒷자리 첫 번호만 저장)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 금액 정보 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">금액 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 보증금 */}
              <div className="space-y-1.5">
                <Label htmlFor="deposit_amount">보증금 (원)</Label>
                <Input
                  id="deposit_amount"
                  type="text"
                  inputMode="numeric"
                  value={commaFmt(form.deposit_amount)}
                  onChange={e => setStr('deposit_amount', digits(e.target.value))}
                  placeholder="0"
                />
              </div>

              {/* 월세 */}
              {!isJeonse && (
                <div className="space-y-1.5">
                  <Label htmlFor="monthly_rent">월세 (원)</Label>
                  <Input
                    id="monthly_rent"
                    type="text"
                    inputMode="numeric"
                    value={commaFmt(form.monthly_rent)}
                    onChange={e => setStr('monthly_rent', digits(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}

              {/* 관리비 */}
              {!isJeonse && (
                <div className="space-y-1.5">
                  <Label htmlFor="monthly_management_fee">관리비 (원)</Label>
                  <Input
                    id="monthly_management_fee"
                    type="text"
                    inputMode="numeric"
                    value={commaFmt(form.monthly_management_fee)}
                    onChange={e => setStr('monthly_management_fee', digits(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}

              {/* 납부일 */}
              {!isJeonse && (
                <div className="space-y-1.5">
                  <Label>납부일</Label>
                  <Select value={form.payment_due_day} onValueChange={v => setStr('payment_due_day', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 부가세 포함 */}
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <input
                  id="vat_included"
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  checked={form.vat_included}
                  onChange={e => setBool('vat_included', e.target.checked)}
                />
                <Label htmlFor="vat_included" className="cursor-pointer">부가세 포함</Label>
              </div>
            </div>

            {/* 보증금 자동반영 */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700">보증금 자동반영</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  checked={form.auto_journal_deposit}
                  onChange={e => setBool('auto_journal_deposit', e.target.checked)}
                />
                <span className="text-sm text-gray-700">
                  보증금 자동반영
                  <span className="text-xs text-gray-400 ml-1">(차변: 보통예금 / 대변: 임대보증금)</span>
                </span>
              </label>
            </div>

            {/* 중개업체 및 중개수수료 */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-700">중개업체 및 중개수수료</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">중개업체 (거래처)</Label>
                  <Select value={form.broker_vendor_id} onValueChange={v => setStr('broker_vendor_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="거래처 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">중개수수료 (원)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={commaFmt(form.broker_fee)}
                    onChange={e => setStr('broker_fee', digits(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  checked={form.auto_journal_broker}
                  onChange={e => setBool('auto_journal_broker', e.target.checked)}
                  disabled={!form.broker_fee}
                />
                <span className="text-sm text-gray-700">
                  중개수수료 자동반영
                  <span className="text-xs text-gray-400 ml-1">(차변: 중개수수료 / 대변: 보통예금)</span>
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* ── 특약·메모 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">특약 · 메모</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="special_terms">특약사항</Label>
              <textarea
                id="special_terms"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                value={form.special_terms}
                onChange={e => setStr('special_terms', e.target.value)}
                placeholder="특약 사항을 입력하세요."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">메모</Label>
              <textarea
                id="notes"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                value={form.notes}
                onChange={e => setStr('notes', e.target.value)}
                placeholder="특이사항을 입력하세요."
              />
            </div>
          </CardContent>
        </Card>

        {/* ── 첨부파일 ── */}
        <Card>
          <CardContent className="pt-5">
            <AttachmentPanel
              urls={attachmentUrls}
              onChange={setAttachmentUrls}
              onError={setError}
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-md">{error}</p>
        )}

        <div className="flex justify-end gap-2 pb-6">
          <Button type="button" variant="outline" asChild>
            <Link href={`/contracts/${contract.id}`}>취소</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '저장 중...' : '변경 사항 저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}
