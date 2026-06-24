'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Store, Pencil, Trash2 } from 'lucide-react'
import type { Vendor } from '@/types/database'

const CATEGORIES = ['중개업', '공공기관', '수리업', '판매업', '기타'] as const
type Category = (typeof CATEGORIES)[number]

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
})

export function VendorsClient({ initial }: { initial: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(makeEmptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    })
    setError(null)
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
    setForm(prev => ({ ...prev, [key]: value }))
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
                  <Input
                    id="v_biz"
                    value={form.businessNumber}
                    onChange={e => setField('businessNumber', formatBizNum(e.target.value))}
                    placeholder="000-00-00000"
                    maxLength={12}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v_phone">전화</Label>
                  <Input
                    id="v_phone"
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
                    <span className="text-gray-700 text-sm">{v.phone}</span>
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
