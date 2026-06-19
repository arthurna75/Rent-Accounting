'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Copy, MapPin, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────
// 카카오 우편번호 서비스 타입
// ────────────────────────────────────────
interface KakaoPostcodeData {
  roadAddress: string       // 도로명주소
  jibunAddress: string      // 지번주소
  zonecode: string          // 우편번호
  buildingName: string      // 건물명
  apartment: string         // 아파트 여부 ('Y'|'N')
  userSelectedType: 'R' | 'J'
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: { oncomplete: (d: KakaoPostcodeData) => void }) => { open(): void }
    }
  }
}

// ────────────────────────────────────────
// 타입
// ────────────────────────────────────────
interface ExistingProperty {
  id: string
  name: string
  address_road: string
  address_detail: string | null
  property_type: string
  rental_tax_type: string
  acquisition_cost: number
  acquisition_date: string
  building_value: number | null
  building_area: number | null
  useful_life: number
  depreciation_method: string
  salvage_value: number
  notes: string | null
}

const INITIAL_FORM = {
  name: '',
  address_road: '',
  address_detail: '',
  property_type: '',
  rental_tax_type: '과세',
  acquisition_cost: '',
  acquisition_date: '',
  building_value: '',
  building_area: '',
  useful_life: '40',
  depreciation_method: '정액법',
  salvage_value: '0',
  notes: '',
}

// 숫자만 추출 (콤마 제거)
function digits(v: string) { return v.replace(/[^0-9]/g, '') }
// 콤마 포맷으로 표시
function commaFmt(v: string) {
  const n = parseInt(digits(v), 10)
  return isNaN(n) ? '' : n.toLocaleString('ko-KR')
}

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [kakaoReady, setKakaoReady] = useState(false)

  // ── 카카오 주소 검색 팝업 열기 ──
  function openAddressSearch() {
    if (!window.daum?.Postcode) return
    new window.daum.Postcode({
      oncomplete(data) {
        // 도로명주소 우선, 없으면 지번주소
        const road = data.roadAddress || data.jibunAddress
        set('address_road', road)
        // 아파트/건물명이 있으면 상세주소에 자동 제안
        if (data.buildingName && data.apartment === 'Y') {
          set('address_detail', data.buildingName)
        }
      },
    }).open()
  }

  // ── 복사 다이얼로그 상태 ──
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyList, setCopyList] = useState<ExistingProperty[]>([])
  const [copySearch, setCopySearch] = useState('')
  const [copyLoading, setCopyLoading] = useState(false)

  const set = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // ── 기존 부동산 목록 로드 & 다이얼로그 오픈 ──
  async function openCopyDialog() {
    setCopyOpen(true)
    if (copyList.length > 0) return
    setCopyLoading(true)
    try {
      const res = await fetch('/api/properties?limit=200')
      const json = await res.json()
      setCopyList(json.data ?? [])
    } catch {
      // silent
    } finally {
      setCopyLoading(false)
    }
  }

  // ── 선택한 부동산 데이터를 폼에 적용 ──
  function applyCopy(p: ExistingProperty) {
    setForm({
      name:                p.name,
      address_road:        p.address_road,
      address_detail:      p.address_detail ?? '',
      property_type:       p.property_type,
      rental_tax_type:     p.rental_tax_type,
      acquisition_cost:    String(p.acquisition_cost),
      acquisition_date:    p.acquisition_date,
      building_value:      p.building_value != null ? String(p.building_value) : '',
      building_area:       p.building_area  != null ? String(p.building_area)  : '',
      useful_life:         String(p.useful_life),
      depreciation_method: p.depreciation_method,
      salvage_value:       String(p.salvage_value),
      notes:               p.notes ?? '',
    })
    setCopyOpen(false)
    setCopySearch('')
    setError(null)
  }

  // ── 검색 필터 ──
  const filteredList = copyList.filter(p =>
    p.name.includes(copySearch) ||
    p.address_road.includes(copySearch) ||
    p.property_type.includes(copySearch),
  )

  // ── 제출 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setShowLoginModal(true); return }

    if (!form.name || !form.address_road || !form.property_type || !form.acquisition_date || !form.acquisition_cost) {
      setError('부동산명, 도로명주소, 유형, 취득일자, 취득가액은 필수 항목입니다.')
      return
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name:                form.name,
        address_road:        form.address_road,
        property_type:       form.property_type,
        rental_tax_type:     form.rental_tax_type,
        acquisition_cost:    parseFloat(form.acquisition_cost),
        acquisition_date:    form.acquisition_date,
        useful_life:         parseInt(form.useful_life) || 40,
        depreciation_method: form.depreciation_method,
        salvage_value:       parseFloat(form.salvage_value) || 0,
      }
      if (form.address_detail) body.address_detail = form.address_detail
      if (form.building_value) body.building_value = parseFloat(form.building_value)
      if (form.building_area)  body.building_area  = parseFloat(form.building_area)
      if (form.notes)          body.notes          = form.notes

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.formErrors?.[0] ?? json.error ?? '등록에 실패했습니다.')
      }

      router.push('/properties')
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 카카오 우편번호 서비스 스크립트 */}
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
        onLoad={() => setKakaoReady(true)}
      />

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        description="부동산을 등록하려면 로그인이 필요합니다."
      />

      {/* ── 기존 부동산 복사 다이얼로그 ── */}
      <Dialog open={copyOpen} onOpenChange={open => { setCopyOpen(open); if (!open) setCopySearch('') }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>기존 부동산에서 복사</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-1">
            선택한 부동산의 정보를 폼에 붙여넣습니다. 복사 후 필요한 항목을 수정하세요.
          </p>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="부동산명 또는 주소로 검색..."
              value={copySearch}
              onChange={e => setCopySearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 목록 */}
          <div className="overflow-y-auto max-h-[52vh] space-y-2 pr-1">
            {copyLoading ? (
              <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
            ) : filteredList.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-10">
                {copySearch ? '검색 결과가 없습니다.' : '등록된 부동산이 없습니다.'}
              </p>
            ) : filteredList.map(p => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {p.property_type} · {p.address_road}{p.address_detail ? ` ${p.address_detail}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    취득가액 {p.acquisition_cost.toLocaleString()}원 · 취득일 {p.acquisition_date}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1"
                  onClick={() => applyCopy(p)}
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">
            <ArrowLeft className="w-4 h-4 mr-1" />
            부동산 목록
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">부동산 등록</CardTitle>
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">부동산명 <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="예: 서울 강남 오피스텔 101호"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address_road">도로명주소 <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    id="address_road"
                    value={form.address_road}
                    onChange={e => set('address_road', e.target.value)}
                    placeholder="주소 검색 버튼을 눌러 주세요"
                    readOnly
                    className="flex-1 bg-gray-50 cursor-pointer"
                    onClick={openAddressSearch}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openAddressSearch}
                    disabled={!kakaoReady}
                    className="shrink-0 gap-1.5"
                  >
                    <MapPin className="w-4 h-4" />
                    {kakaoReady ? '주소 검색' : '로딩 중...'}
                  </Button>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address_detail">상세주소 <span className="text-xs text-gray-400">(동·호수 등)</span></Label>
                <Input
                  id="address_detail"
                  placeholder="예: 101호"
                  value={form.address_detail}
                  onChange={e => set('address_detail', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>유형 <span className="text-red-500">*</span></Label>
                <Select value={form.property_type} onValueChange={v => set('property_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="아파트">아파트</SelectItem>
                    <SelectItem value="다세대">다세대</SelectItem>
                    <SelectItem value="단독주택">단독주택</SelectItem>
                    <SelectItem value="상가">상가</SelectItem>
                    <SelectItem value="오피스텔">오피스텔</SelectItem>
                    <SelectItem value="근린생활시설">근린생활시설</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>과세유형 <span className="text-red-500">*</span></Label>
                <Select value={form.rental_tax_type} onValueChange={v => set('rental_tax_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="과세">과세</SelectItem>
                    <SelectItem value="면세">면세</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acquisition_date">취득일자 <span className="text-red-500">*</span></Label>
                <Input
                  id="acquisition_date"
                  type="date"
                  value={form.acquisition_date}
                  onChange={e => set('acquisition_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acquisition_cost">취득가액 (원) <span className="text-red-500">*</span></Label>
                <Input
                  id="acquisition_cost"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={commaFmt(form.acquisition_cost)}
                  onChange={e => set('acquisition_cost', digits(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="building_value">건물가액 (원)</Label>
                <Input
                  id="building_value"
                  type="text"
                  inputMode="numeric"
                  placeholder="감가상각 기준금액"
                  value={commaFmt(form.building_value)}
                  onChange={e => set('building_value', digits(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="building_area">건물면적 (㎡)</Label>
                <Input
                  id="building_area"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.building_area}
                  onChange={e => set('building_area', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>감가상각방법</Label>
                <Select value={form.depreciation_method} onValueChange={v => set('depreciation_method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="정액법">정액법</SelectItem>
                    <SelectItem value="정률법">정률법</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="useful_life">내용연수 (년)</Label>
                <Input
                  id="useful_life"
                  type="number"
                  min="1"
                  value={form.useful_life}
                  onChange={e => set('useful_life', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="salvage_value">잔존가치 (원)</Label>
                <Input
                  id="salvage_value"
                  type="text"
                  inputMode="numeric"
                  value={commaFmt(form.salvage_value)}
                  onChange={e => set('salvage_value', digits(e.target.value))}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="notes">메모</Label>
                <textarea
                  id="notes"
                  rows={3}
                  className={cn(
                    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                    'ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none',
                  )}
                  placeholder="특이사항, 관리 메모 등"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? '등록 중...' : '부동산 등록'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/properties">취소</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
