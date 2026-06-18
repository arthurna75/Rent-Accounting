'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [form, setForm] = useState({
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
  })

  const set = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

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
        name: form.name,
        address_road: form.address_road,
        property_type: form.property_type,
        rental_tax_type: form.rental_tax_type,
        acquisition_cost: parseFloat(form.acquisition_cost),
        acquisition_date: form.acquisition_date,
        useful_life: parseInt(form.useful_life) || 40,
        depreciation_method: form.depreciation_method,
        salvage_value: parseFloat(form.salvage_value) || 0,
      }
      if (form.address_detail) body.address_detail = form.address_detail
      if (form.building_value) body.building_value = parseFloat(form.building_value)
      if (form.building_area) body.building_area = parseFloat(form.building_area)
      if (form.notes) body.notes = form.notes

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
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        description="부동산을 등록하려면 로그인이 필요합니다."
      />
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
          <CardTitle className="text-lg">부동산 등록</CardTitle>
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
                <Input
                  id="address_road"
                  placeholder="예: 서울특별시 강남구 테헤란로 123"
                  value={form.address_road}
                  onChange={e => set('address_road', e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address_detail">상세주소</Label>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.acquisition_cost}
                  onChange={e => set('acquisition_cost', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="building_value">건물가액 (원)</Label>
                <Input
                  id="building_value"
                  type="number"
                  min="0"
                  placeholder="감가상각 기준금액"
                  value={form.building_value}
                  onChange={e => set('building_value', e.target.value)}
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  type="number"
                  min="0"
                  value={form.salvage_value}
                  onChange={e => set('salvage_value', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="notes">메모</Label>
                <textarea
                  id="notes"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
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
