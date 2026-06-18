'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'

interface Property {
  id: string
  name: string
  address_road: string
  address_detail: string | null
  property_type: string
  rental_tax_type: string
  acquisition_cost: number | null
  acquisition_date: string | null
  building_value: number | null
  building_area: number | null
  useful_life: number
  depreciation_method: string
  salvage_value: number
  notes: string | null
}

export default function PropertyEditForm({ property }: { property: Property }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [form, setForm] = useState({
    name: property.name,
    address_road: property.address_road,
    address_detail: property.address_detail ?? '',
    property_type: property.property_type,
    rental_tax_type: property.rental_tax_type,
    acquisition_cost: property.acquisition_cost?.toString() ?? '',
    acquisition_date: property.acquisition_date ?? '',
    building_value: property.building_value?.toString() ?? '',
    building_area: property.building_area?.toString() ?? '',
    useful_life: property.useful_life.toString(),
    depreciation_method: property.depreciation_method,
    salvage_value: property.salvage_value.toString(),
    notes: property.notes ?? '',
  })

  const set = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setShowLoginModal(true); return }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        address_road: form.address_road,
        property_type: form.property_type,
        rental_tax_type: form.rental_tax_type,
        acquisition_cost: parseFloat(form.acquisition_cost) || 0,
        acquisition_date: form.acquisition_date,
        useful_life: parseInt(form.useful_life) || 40,
        depreciation_method: form.depreciation_method,
        salvage_value: parseFloat(form.salvage_value) || 0,
      }
      if (form.address_detail) body.address_detail = form.address_detail
      if (form.building_value) body.building_value = parseFloat(form.building_value)
      if (form.building_area) body.building_area = parseFloat(form.building_area)
      if (form.notes) body.notes = form.notes

      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '수정에 실패했습니다.')
      }
      router.push(`/properties/${property.id}`)
      router.refresh()
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
        description="부동산 정보를 수정하려면 로그인이 필요합니다."
      />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/properties/${property.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            부동산 상세
          </Link>
        </Button>
        <h2 className="text-xl font-semibold text-gray-900">부동산 수정</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{property.name}</CardTitle>
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
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address_road">도로명주소 <span className="text-red-500">*</span></Label>
                <Input
                  id="address_road"
                  value={form.address_road}
                  onChange={e => set('address_road', e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address_detail">상세주소</Label>
                <Input
                  id="address_detail"
                  value={form.address_detail}
                  onChange={e => set('address_detail', e.target.value)}
                  placeholder="예: 101호"
                />
              </div>

              <div className="space-y-1.5">
                <Label>유형 <span className="text-red-500">*</span></Label>
                <Select value={form.property_type} onValueChange={v => set('property_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  type="number"
                  min="0"
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
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? '저장 중...' : '변경 사항 저장'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/properties/${property.id}`}>취소</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
