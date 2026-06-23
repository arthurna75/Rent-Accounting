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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="v_address">주소</Label>
                  <Input
                    id="v_address"
                    value={form.address}
                    onChange={e => setField('address', e.target.value)}
                    placeholder="주소"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">등록일자</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">분류</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">거래처명</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">대표자</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">전화</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">사업자번호</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">주소</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">메모</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-400">
                      등록된 거래처가 없습니다.
                    </td>
                  </tr>
                )}
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{v.registered_at ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{v.category ?? '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                    <td className="px-4 py-3 text-gray-600">{v.representative ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{v.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{v.business_number ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[10rem] truncate">{v.address ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[8rem] truncate">{v.memo ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
