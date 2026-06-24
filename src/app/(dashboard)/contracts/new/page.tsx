'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
import { ArrowLeft, Copy, Search, TrendingUp, AlertTriangle, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AttachmentPanel } from '@/components/ui/AttachmentPanel'
import { formatKRW } from '@/lib/utils/format'

// ────────────────────────────────────────
// 타입
// ────────────────────────────────────────
interface Property {
  id: string
  building_name: string
  unit_number: string
  address_road: string
}

interface ActiveContract {
  id: string
  lessee_name: string
  lessee_phone: string | null
  lessee_email: string | null
  lessee_id_number: string | null
  contract_type: string
  deposit_amount: number
  monthly_rent: number
  monthly_management_fee: number | null
  vat_included: boolean
  payment_due_day: number
  start_date: string
  end_date: string
  notes: string | null
}

interface ExistingContract {
  id: string
  contract_number: string
  property_id: string
  contract_type: ContractType
  lessee_name: string
  lessee_phone: string | null
  lessee_email: string | null
  lessee_id_number?: string | null
  deposit_amount: number
  monthly_rent: number
  monthly_management_fee?: number | null
  vat_included: boolean
  payment_due_day: number
  notes: string | null
  property?: { building_name: string; unit_number: string; address_road: string }
}

type ContractType = '월세' | '전세' | '반전세'

interface Vendor {
  id: string
  name: string
  business_number: string | null
}

interface FormState {
  property_id:              string
  contract_type:            ContractType
  contract_number:          string
  contract_date:            string
  lessee_name:              string
  lessee_phone:             string
  lessee_id_front:          string
  lessee_id_back:           string
  lessee_email:             string
  deposit_amount:           string
  monthly_rent:             string
  monthly_management_fee:   string
  vat_included:             boolean
  payment_due_day:          string
  auto_journal_rent:        boolean
  auto_journal_mgmt:        boolean
  auto_journal_deposit:     boolean
  auto_journal_broker:      boolean
  broker_vendor_id:         string
  broker_fee:               string
  start_date:               string
  end_date:                 string
  notes:                    string
}

const INITIAL: FormState = {
  property_id:            '',
  contract_type:          '월세',
  contract_number:        '',
  contract_date:          '',
  lessee_name:            '',
  lessee_phone:           '',
  lessee_id_front:        '',
  lessee_id_back:         '',
  lessee_email:           '',
  deposit_amount:         '',
  monthly_rent:           '',
  monthly_management_fee: '',
  vat_included:           true,
  payment_due_day:        '1',
  auto_journal_rent:      false,
  auto_journal_mgmt:      false,
  auto_journal_deposit:   false,
  auto_journal_broker:    false,
  broker_vendor_id:       '',
  broker_fee:             '',
  start_date:             '',
  end_date:               '',
  notes:                  '',
}

function digits(v: string) { return v.replace(/[^0-9]/g, '') }
function commaFmt(v: string) {
  const n = parseInt(digits(v), 10)
  return isNaN(n) ? '' : n.toLocaleString('ko-KR')
}
function propLabel(p: { building_name: string; unit_number: string } | null | undefined) {
  if (!p) return ''
  return p.unit_number ? `${p.building_name} ${p.unit_number}` : p.building_name
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 mr-2">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value || '—'}</span>
    </div>
  )
}

// ────────────────────────────────────────
// 메인
// ────────────────────────────────────────
export default function NewContractPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const propertyIdParam = searchParams.get('propertyId') ?? ''

  const [properties,          setProperties]          = useState<Property[]>([])
  const [vendors,             setVendors]             = useState<Vendor[]>([])
  const [selectedBuilding,    setSelectedBuilding]    = useState('')
  const [form,                setForm]                = useState<FormState>({ ...INITIAL, property_id: propertyIdParam })
  const [submitting,          setSubmitting]          = useState(false)
  const [error,               setError]              = useState<string | null>(null)
  const [showLoginModal,      setShowLoginModal]      = useState(false)
  const [attachmentUrls,      setAttachmentUrls]      = useState<string[]>([])
  const [activeContract,      setActiveContract]      = useState<ActiveContract | null>(null)
  const [activeContractLoading, setActiveContractLoading] = useState(false)
  const [baseRate,            setBaseRate]            = useState('2.50')

  const idFrontRef = useRef<HTMLInputElement>(null)
  const idBackRef  = useRef<HTMLInputElement>(null)

  // ── 기존 계약 복사 다이얼로그 ──
  const [copyOpen,    setCopyOpen]    = useState(false)
  const [copyList,    setCopyList]    = useState<ExistingContract[]>([])
  const [copySearch,  setCopySearch]  = useState('')
  const [copyLoading, setCopyLoading] = useState(false)

  // ── 초기 데이터 로드 ──
  useEffect(() => {
    fetch('/api/properties?limit=200')
      .then(r => r.json())
      .then(json => {
        const props: Property[] = json.data ?? []
        setProperties(props)
        if (propertyIdParam) {
          const found = props.find(p => p.id === propertyIdParam)
          if (found) setSelectedBuilding(found.building_name)
        }
      })
      .catch(() => {})

    fetch('/api/contracts/next-number')
      .then(r => r.json())
      .then(json => { if (json.number) set('contract_number', json.number) })
      .catch(() => {})

    fetch('/api/vendors?limit=200')
      .then(r => r.json())
      .then(json => setVendors(json.data ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 호실 변경 시 기존 활성 계약 조회 ──
  useEffect(() => {
    if (!form.property_id) {
      setActiveContract(null)
      return
    }
    setActiveContractLoading(true)
    fetch(`/api/contracts?property_id=${form.property_id}&status=active&limit=1`)
      .then(r => r.json())
      .then(json => setActiveContract((json.data ?? [])[0] ?? null))
      .catch(() => setActiveContract(null))
      .finally(() => setActiveContractLoading(false))
  }, [form.property_id])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const buildings = useMemo(() =>
    [...new Set(properties.map(p => p.building_name))].sort(),
    [properties]
  )
  const unitsForBuilding = useMemo(() =>
    selectedBuilding ? properties.filter(p => p.building_name === selectedBuilding) : [],
    [properties, selectedBuilding]
  )

  function handleBuildingChange(building: string) {
    setSelectedBuilding(building)
    set('property_id', '')
  }

  // ── 기존 활성 계약에서 복제 ──
  function applyCloneFromActive() {
    if (!activeContract) return
    const [idFront = '', idBack = ''] = (activeContract.lessee_id_number ?? '').split('-')
    setForm(prev => ({
      ...prev,
      contract_type:          activeContract.contract_type as ContractType,
      lessee_name:            activeContract.lessee_name,
      lessee_phone:           activeContract.lessee_phone ?? '',
      lessee_email:           activeContract.lessee_email ?? '',
      lessee_id_front:        idFront,
      lessee_id_back:         idBack,
      deposit_amount:         String(activeContract.deposit_amount),
      monthly_rent:           String(activeContract.monthly_rent),
      monthly_management_fee: activeContract.monthly_management_fee
                                ? String(activeContract.monthly_management_fee)
                                : '',
      payment_due_day:        String(activeContract.payment_due_day),
      vat_included:           activeContract.vat_included,
      notes:                  activeContract.notes ?? '',
    }))
  }

  // ── 기존 계약 복사 다이얼로그 ──
  async function openCopyDialog() {
    setCopyOpen(true)
    if (copyList.length > 0) return
    setCopyLoading(true)
    try {
      const res = await fetch('/api/contracts?limit=200')
      const json = await res.json()
      setCopyList(json.data ?? [])
    } catch { /* silent */ }
    finally { setCopyLoading(false) }
  }

  function applyCopy(c: ExistingContract) {
    const [idFront = '', idBack = ''] = (c.lessee_id_number ?? '').split('-')
    const prop = properties.find(p => p.id === c.property_id)
    if (prop) setSelectedBuilding(prop.building_name)
    setForm(prev => ({
      ...INITIAL,
      contract_number:        prev.contract_number,
      property_id:            c.property_id,
      contract_type:          c.contract_type,
      contract_date:          '',
      lessee_name:            c.lessee_name,
      lessee_phone:           c.lessee_phone ?? '',
      lessee_id_front:        idFront,
      lessee_id_back:         idBack,
      lessee_email:           c.lessee_email ?? '',
      deposit_amount:         String(c.deposit_amount),
      monthly_rent:           String(c.monthly_rent),
      monthly_management_fee: c.monthly_management_fee ? String(c.monthly_management_fee) : '',
      vat_included:           c.vat_included,
      payment_due_day:        String(c.payment_due_day),
      start_date:             '',
      end_date:               '',
      notes:                  c.notes ?? '',
    }))
    setCopyOpen(false)
    setCopySearch('')
    setError(null)
  }

  const filteredContracts = copyList.filter(c =>
    c.lessee_name.includes(copySearch) ||
    c.contract_number.includes(copySearch) ||
    (c.property?.building_name ?? '').includes(copySearch) ||
    (c.property?.unit_number ?? '').includes(copySearch),
  )

  // ── 인상률 계산 ──
  const baseRateNum    = parseFloat(baseRate) || 0
  const conversionRate = baseRateNum + 2.0

  const prevDeposit = activeContract?.deposit_amount ?? 0
  const prevRent    = activeContract?.monthly_rent ?? 0
  const prevEquiv   = useMemo(() =>
    conversionRate > 0 && activeContract
      ? prevDeposit + (prevRent * 12) / (conversionRate / 100)
      : 0,
    [prevDeposit, prevRent, conversionRate, activeContract]
  )

  const nextDeposit = parseInt(digits(form.deposit_amount), 10) || 0
  const nextRent    = parseInt(digits(form.monthly_rent),   10) || 0
  const nextEquiv   = useMemo(() =>
    conversionRate > 0
      ? nextDeposit + (nextRent * 12) / (conversionRate / 100)
      : 0,
    [nextDeposit, nextRent, conversionRate]
  )

  const increaseRate = prevEquiv > 0 ? ((nextEquiv - prevEquiv) / prevEquiv) * 100 : 0

  const periodDays = useMemo(() => {
    if (!form.start_date || !activeContract?.start_date) return null
    return Math.floor(
      (new Date(form.start_date).getTime() - new Date(activeContract.start_date).getTime()) /
      (1000 * 60 * 60 * 24)
    )
  }, [form.start_date, activeContract])

  const hasNewAmounts = nextDeposit > 0 || nextRent > 0
  const showWarning   = hasNewAmounts && periodDays !== null && periodDays < 365 && increaseRate > 5

  // ── 제출 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setShowLoginModal(true); return }

    if (!form.property_id)           { setError('부동산(호실)을 선택해 주세요.');       return }
    if (!form.lessee_name.trim())    { setError('임차인명을 입력해 주세요.');            return }
    if (!form.lessee_phone.trim())   { setError('연락처를 입력해 주세요.');              return }
    if (!form.contract_date)         { setError('계약일자를 입력해 주세요.');            return }
    if (form.lessee_id_front.length !== 6) { setError('주민번호 앞 6자리를 입력해 주세요.'); return }
    if (form.lessee_id_back.length  !== 1) { setError('주민번호 뒷 1자리를 입력해 주세요.'); return }
    if (!form.start_date || !form.end_date) { setError('계약 기간을 입력해 주세요.'); return }
    if (!form.contract_number.trim()) { setError('계약 번호를 입력해 주세요.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/contracts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id:            form.property_id,
          contract_type:          form.contract_type,
          contract_number:        form.contract_number,
          contract_date:          form.contract_date,
          lessee_name:            form.lessee_name,
          lessee_id_number:       `${form.lessee_id_front}-${form.lessee_id_back}`,
          lessee_phone:           form.lessee_phone  || undefined,
          lessee_email:           form.lessee_email  || undefined,
          deposit_amount:         parseInt(digits(form.deposit_amount), 10) || 0,
          monthly_rent:           parseInt(digits(form.monthly_rent),   10) || 0,
          monthly_management_fee: form.monthly_management_fee
                                    ? (parseInt(digits(form.monthly_management_fee), 10) || 0)
                                    : undefined,
          vat_included:           form.vat_included,
          payment_due_day:        parseInt(form.payment_due_day) || 1,
          auto_journal_rent:      form.auto_journal_rent,
          auto_journal_mgmt:      form.auto_journal_mgmt,
          auto_journal_deposit:   form.auto_journal_deposit,
          auto_journal_broker:    form.auto_journal_broker,
          broker_vendor_id:       form.broker_vendor_id || undefined,
          broker_fee:             form.broker_fee ? (parseInt(digits(form.broker_fee), 10) || 0) : undefined,
          start_date:             form.start_date,
          end_date:               form.end_date,
          notes:                  form.notes || undefined,
          attachment_urls:        attachmentUrls.length > 0 ? attachmentUrls : undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.formErrors?.[0] ?? json.error ?? '등록 실패')
      }
      router.push('/contracts')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const isJeonse = form.contract_type === '전세'

  return (
    <div className="max-w-6xl mx-auto space-y-5">
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
            <span className="text-amber-600 ml-1">계약일자·계약기간은 초기화되니 새로 입력하세요.</span>
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="임차인명, 계약번호, 건물명, 호실 검색..."
              value={copySearch}
              onChange={e => setCopySearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{c.contract_type}</span>
                    <span className="text-xs text-gray-400">{c.contract_number}</span>
                  </div>
                  {c.property && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {propLabel(c.property)}{c.property.address_road ? ` · ${c.property.address_road}` : ''}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    보증금 {c.deposit_amount.toLocaleString()}원
                    {c.monthly_rent > 0 && ` · 월세 ${c.monthly_rent.toLocaleString()}원`}
                    {c.monthly_management_fee && c.monthly_management_fee > 0
                      ? ` · 관리비 ${c.monthly_management_fee.toLocaleString()}원` : ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => applyCopy(c)}>
                  <Copy className="w-3.5 h-3.5" />
                  복사
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 헤더 ── */}
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
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-gray-600" onClick={openCopyDialog}>
          <Copy className="w-3.5 h-3.5" />
          기존에서 복사
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 좌우 분할 패널 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── 왼쪽: 부동산 선택 + 기존 계약 (변경전) ── */}
          <div className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader className="pb-3 bg-gray-50 rounded-t-lg border-b border-gray-100">
                <CardTitle className="text-sm font-semibold text-gray-500">부동산 선택</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label>건물명 <span className="text-red-500">*</span></Label>
                  <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="건물 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>호실 <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.property_id}
                    onValueChange={v => set('property_id', v)}
                    disabled={!selectedBuilding}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedBuilding ? '호실 선택' : '건물 먼저 선택'} />
                    </SelectTrigger>
                    <SelectContent>
                      {unitsForBuilding.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.unit_number || '(단일 호실)'}{p.address_road ? ` · ${p.address_road}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 기존 활성 계약 (변경전) */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3 bg-gray-50 rounded-t-lg border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-500">기존 계약 (변경전)</CardTitle>
                  {activeContract && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-7 border-blue-200 text-blue-600 hover:bg-blue-100"
                      onClick={applyCloneFromActive}
                    >
                      <Copy className="w-3 h-3" />
                      변경전에서 복제
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {!form.property_id ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    호실을 선택하면 기존 계약이 표시됩니다.
                  </p>
                ) : activeContractLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">조회 중...</span>
                  </div>
                ) : activeContract ? (
                  <div>
                    <InfoItem label="계약유형"  value={activeContract.contract_type} />
                    <InfoItem label="임차인"     value={activeContract.lessee_name} />
                    <InfoItem label="연락처"     value={activeContract.lessee_phone ?? ''} />
                    <InfoItem label="보증금"     value={formatKRW(activeContract.deposit_amount)} />
                    {activeContract.monthly_rent > 0 && (
                      <InfoItem label="월세"     value={formatKRW(activeContract.monthly_rent)} />
                    )}
                    {activeContract.monthly_management_fee && activeContract.monthly_management_fee > 0 && (
                      <InfoItem label="관리비"   value={formatKRW(activeContract.monthly_management_fee)} />
                    )}
                    <InfoItem label="임대기간"   value={`${activeContract.start_date} ~ ${activeContract.end_date}`} />
                    {activeContract.notes && (
                      <InfoItem label="메모"     value={activeContract.notes} />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    해당 호실의 활성 계약이 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── 오른쪽: 신규 계약 (변경후) ── */}
          <div className="space-y-4">
            <Card className="border-blue-200">
              <CardHeader className="pb-3 bg-blue-50 rounded-t-lg border-b border-blue-100">
                <CardTitle className="text-sm font-semibold text-blue-700">
                  {activeContract ? '변경후 (신규 계약)' : '신규 계약 정보'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">

                {/* 계약 기본 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">계약유형 <span className="text-red-500">*</span></Label>
                    <Select value={form.contract_type} onValueChange={v => set('contract_type', v as ContractType)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="월세">월세</SelectItem>
                        <SelectItem value="전세">전세</SelectItem>
                        <SelectItem value="반전세">반전세</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">계약번호 <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.contract_number}
                      onChange={e => set('contract_number', e.target.value)}
                      placeholder="예) 2026-01"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">계약일자 <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={form.contract_date}
                      onChange={e => set('contract_date', e.target.value)}
                      className="h-8 text-sm w-full"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">임대기간 <span className="text-red-500">*</span></Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={form.start_date}
                        onChange={e => set('start_date', e.target.value)}
                        className="flex-1 h-8 text-sm"
                      />
                      <span className="text-gray-400 shrink-0 text-xs">~</span>
                      <Input
                        type="date"
                        value={form.end_date}
                        onChange={e => set('end_date', e.target.value)}
                        className="flex-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">임차인 정보</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">임차인명 <span className="text-red-500">*</span></Label>
                      <Input
                        value={form.lessee_name}
                        onChange={e => set('lessee_name', e.target.value)}
                        placeholder="홍길동"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">연락처 <span className="text-red-500">*</span></Label>
                      <Input
                        value={form.lessee_phone}
                        onChange={e => set('lessee_phone', e.target.value)}
                        placeholder="010-0000-0000"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">주민번호 <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          ref={idFrontRef}
                          type="text"
                          inputMode="numeric"
                          value={form.lessee_id_front}
                          onChange={e => {
                            const v = digits(e.target.value).slice(0, 6)
                            set('lessee_id_front', v)
                            if (v.length === 6) idBackRef.current?.focus()
                          }}
                          maxLength={6}
                          placeholder="생년월일 6자리"
                          className="w-28 h-8 text-sm font-mono tracking-widest text-center"
                        />
                        <span className="text-gray-500 font-medium select-none shrink-0">-</span>
                        <Input
                          ref={idBackRef}
                          type="text"
                          inputMode="numeric"
                          value={form.lessee_id_back}
                          onChange={e => set('lessee_id_back', digits(e.target.value).slice(0, 1))}
                          onKeyDown={e => {
                            if (e.key === 'Backspace' && !form.lessee_id_back) idFrontRef.current?.focus()
                          }}
                          maxLength={1}
                          placeholder="X"
                          className="w-10 h-8 text-sm font-mono text-center"
                        />
                        <span className="text-gray-300 font-mono text-xs tracking-widest select-none">●●●●●●</span>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">이메일</Label>
                      <Input
                        type="email"
                        value={form.lessee_email}
                        onChange={e => set('lessee_email', e.target.value)}
                        placeholder="example@email.com"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">금액 정보</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">보증금 (원)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={commaFmt(form.deposit_amount)}
                        onChange={e => set('deposit_amount', digits(e.target.value))}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                    {!isJeonse && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">월세 (원)</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={commaFmt(form.monthly_rent)}
                          onChange={e => set('monthly_rent', digits(e.target.value))}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                    {!isJeonse && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">관리비 (원)</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={commaFmt(form.monthly_management_fee)}
                          onChange={e => set('monthly_management_fee', digits(e.target.value))}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                    {!isJeonse && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">납부일</Label>
                        <Select value={form.payment_due_day} onValueChange={v => set('payment_due_day', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                              <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="col-span-2 flex items-center gap-2 pt-1">
                      <input
                        id="vat_included"
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        checked={form.vat_included}
                        onChange={e => set('vat_included', e.target.checked)}
                      />
                      <Label htmlFor="vat_included" className="cursor-pointer text-sm">부가세 포함</Label>
                    </div>
                  </div>

                  {/* 수입 자동반영 */}
                  <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-700">수입 자동반영</p>
                    <p className="text-xs text-blue-500">체크 시 계약 등록과 동시에 분개장 초안 자동 기입</p>
                    <div className="flex flex-col gap-1.5 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          checked={form.auto_journal_deposit}
                          onChange={e => set('auto_journal_deposit', e.target.checked)}
                          disabled={!form.deposit_amount} />
                        <span className="text-xs text-gray-700">
                          보증금 <span className="text-gray-400">(차: 보통예금 / 대: 임대보증금)</span>
                        </span>
                      </label>
                      {!isJeonse && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            checked={form.auto_journal_rent}
                            onChange={e => set('auto_journal_rent', e.target.checked)}
                            disabled={!form.monthly_rent} />
                          <span className="text-xs text-gray-700">
                            월세 <span className="text-gray-400">(차: 보통예금 / 대: 임대수익)</span>
                          </span>
                        </label>
                      )}
                      {!isJeonse && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            checked={form.auto_journal_mgmt}
                            onChange={e => set('auto_journal_mgmt', e.target.checked)}
                            disabled={!form.monthly_management_fee} />
                          <span className="text-xs text-gray-700">
                            관리비 <span className="text-gray-400">(차: 보통예금 / 대: 관리비수익)</span>
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 중개업체 및 중개수수료 */}
                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">중개업체 및 중개수수료</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">중개업체 (거래처)</Label>
                        <Select value={form.broker_vendor_id} onValueChange={v => set('broker_vendor_id', v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="거래처 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">중개수수료 (원)</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={commaFmt(form.broker_fee)}
                          onChange={e => set('broker_fee', digits(e.target.value))}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        checked={form.auto_journal_broker}
                        onChange={e => set('auto_journal_broker', e.target.checked)}
                        disabled={!form.broker_fee} />
                      <span className="text-xs text-gray-700">
                        중개수수료 자동반영
                        <span className="text-gray-400 ml-1">(차: 중개수수료 / 대: 보통예금)</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">메모</Label>
                    <textarea
                      className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="특이사항을 입력하세요."
                    />
                  </div>
                  <AttachmentPanel
                    urls={attachmentUrls}
                    onChange={setAttachmentUrls}
                    onError={setError}
                  />
                </div>

              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── 임대료 인상률 계산 (기존 계약이 있을 때만 표시) ── */}
        {activeContract && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                임대료 인상률 계산
                <span className="text-xs font-normal text-gray-400 ml-1">
                  (민간임대주택에 관한 특별법 제44조)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">한국은행 기준금리</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="20"
                      value={baseRate}
                      onChange={e => setBaseRate(e.target.value)}
                      className="h-7 w-20 text-sm text-right"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  월차임 전환 산정률 (주임법 제7조의2) =
                  <strong className="text-gray-700">{conversionRate.toFixed(2)}%</strong>
                  <span className="text-gray-400">({baseRate}% + 2.00%)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-1">
                  <p className="text-xs text-gray-500">변경전 환산보증금</p>
                  <p className="text-base font-bold text-gray-800">
                    {prevEquiv > 0 ? `${Math.round(prevEquiv).toLocaleString('ko-KR')}원` : '—'}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {formatKRW(prevDeposit)}<br />
                    + {formatKRW(prevRent)} × 12 ÷ {conversionRate.toFixed(2)}%
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-1">
                  <p className="text-xs text-blue-600">변경후 환산보증금</p>
                  <p className="text-base font-bold text-blue-800">
                    {nextEquiv > 0 ? `${Math.round(nextEquiv).toLocaleString('ko-KR')}원` : '—'}
                  </p>
                  <p className="text-xs text-blue-400 leading-relaxed">
                    {nextDeposit ? formatKRW(nextDeposit) : '0원'}<br />
                    + {nextRent ? formatKRW(nextRent) : '0원'} × 12 ÷ {conversionRate.toFixed(2)}%
                  </p>
                </div>

                <div className={`rounded-lg border p-3 space-y-1 ${
                  increaseRate > 5 ? 'bg-red-50 border-red-200' :
                  increaseRate > 0 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
                }`}>
                  <p className={`text-xs ${
                    increaseRate > 5 ? 'text-red-600' :
                    increaseRate > 0 ? 'text-green-600' : 'text-gray-500'
                  }`}>임대료 인상률</p>
                  <p className={`text-xl font-bold ${
                    increaseRate > 5 ? 'text-red-700' :
                    increaseRate > 0 ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    {hasNewAmounts && prevEquiv > 0
                      ? `${increaseRate >= 0 ? '+' : ''}${increaseRate.toFixed(2)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {periodDays !== null
                      ? `${periodDays}일 (${Math.floor(periodDays / 30)}개월)`
                      : '임대기간 입력 필요'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-600">계산 공식</p>
                <p>※ 환산보증금 = 임대보증금 + (월임대료 × 12) ÷ 월차임 전환 산정률</p>
                <p>※ 인상률 = (변경후 환산보증금 − 변경전 환산보증금) ÷ 변경전 환산보증금 × 100</p>
                <p>※ 월차임 전환 산정률 = 한국은행 기준금리 + 2% (주택임대차보호법 제7조의2)</p>
              </div>

              {showWarning && (
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-300 p-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-800">임대료 5% 초과 인상 경고</p>
                    <p className="text-xs text-amber-700">
                      기존 계약 임대기간 시작일({activeContract.start_date})부터
                      신규 임대기간 시작일({form.start_date})까지
                      <strong> {periodDays}일 ({Math.floor(periodDays! / 30)}개월)</strong>로 <strong>1년 미만</strong>입니다.
                    </p>
                    <p className="text-xs text-amber-700 font-medium">
                      주택임대사업자 등록의 경우 임대기간 1년 미만에서 5%를 초과하는 임대료 인상은 할 수 없습니다.
                      현재 인상률: <strong>{increaseRate.toFixed(2)}%</strong>
                    </p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

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
