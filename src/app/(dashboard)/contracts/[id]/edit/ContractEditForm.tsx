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
  address_road: string | null
}

interface LeaseContract {
  id: string
  property_id: string
  lessee_name: string
  lessee_phone: string | null
  lessee_email: string | null
  contract_type: string
  contract_number: string
  deposit_amount: number
  monthly_rent: number
  vat_included: boolean
  payment_due_day: number
  start_date: string
  end_date: string
  notes: string | null
  special_terms: string | null
}

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

  const [form, setForm] = useState({
    lessee_phone: contract.lessee_phone ?? '',
    lessee_email: contract.lessee_email ?? '',
    end_date: contract.end_date,
    monthly_rent: contract.monthly_rent.toString(),
    payment_due_day: contract.payment_due_day.toString(),
    notes: contract.notes ?? '',
    special_terms: contract.special_terms ?? '',
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
        lessee_phone: form.lessee_phone || null,
        lessee_email: form.lessee_email || null,
        end_date: form.end_date,
        payment_due_day: parseInt(form.payment_due_day) || 1,
        notes: form.notes || null,
        special_terms: form.special_terms || null,
      }
      if (contract.contract_type !== '전세') {
        body.monthly_rent = parseFloat(form.monthly_rent) || 0
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

  const currentProp = properties.find(p => p.id === contract.property_id)
  const isJeonse = contract.contract_type === '전세'

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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 읽기 전용 기본 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기본 정보 (변경 불가)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-gray-500">부동산</Label>
                <p className="text-sm font-medium text-gray-800">
                  {currentProp?.name ?? '—'}
                  {currentProp?.address_road ? ` · ${currentProp.address_road}` : ''}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">임차인</Label>
                <p className="text-sm font-medium text-gray-800">{contract.lessee_name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">계약 유형</Label>
                <p className="text-sm font-medium text-gray-800">{contract.contract_type}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">계약 번호</Label>
                <p className="text-sm font-medium text-gray-800">{contract.contract_number}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">계약 시작일</Label>
                <p className="text-sm font-medium text-gray-800">{contract.start_date}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">보증금</Label>
                <p className="text-sm font-medium text-gray-800">
                  {contract.deposit_amount.toLocaleString('ko-KR')}원
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 수정 가능 필드 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">수정 가능 항목</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lessee_phone">연락처</Label>
                <Input
                  id="lessee_phone"
                  value={form.lessee_phone}
                  onChange={e => set('lessee_phone', e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lessee_email">이메일</Label>
                <Input
                  id="lessee_email"
                  type="email"
                  value={form.lessee_email}
                  onChange={e => set('lessee_email', e.target.value)}
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date">계약 종료일</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                  required
                />
              </div>

              {!isJeonse && (
                <div className="space-y-1.5">
                  <Label htmlFor="monthly_rent">월세 (원)</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    min="0"
                    value={form.monthly_rent}
                    onChange={e => set('monthly_rent', e.target.value)}
                  />
                </div>
              )}

              {!isJeonse && (
                <div className="space-y-1.5">
                  <Label>납부일</Label>
                  <Select
                    value={form.payment_due_day}
                    onValueChange={v => set('payment_due_day', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="special_terms">특약사항</Label>
                <textarea
                  id="special_terms"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  value={form.special_terms}
                  onChange={e => set('special_terms', e.target.value)}
                  placeholder="특약 사항을 입력하세요."
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="notes">메모</Label>
                <textarea
                  id="notes"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="특이사항을 입력하세요."
                />
              </div>
            </div>
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
