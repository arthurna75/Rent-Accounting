'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Store } from 'lucide-react'
import type { Vendor } from '@/types/database'

export function VendorsClient({ initial }: { initial: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initial)

  // 신규 등록 폼
  const [name, setName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/vendors')
      const json = await res.json()
      setVendors(json.data ?? [])
    } catch {
      // ignore
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('거래처명을 입력해 주세요.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          business_number: businessNumber.trim() || null,
          memo: memo.trim() || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '등록 실패')
      }
      setName('')
      setBusinessNumber('')
      setMemo('')
      setShowForm(false)
      await loadVendors()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-900">거래처 관리</h2>
        </div>
        <Button onClick={() => setShowForm(v => !v)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          거래처 등록
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">신규 거래처 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor_name">거래처명 <span className="text-red-500">*</span></Label>
                  <Input
                    id="vendor_name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="예) 삼성화재, 국민은행"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_number">사업자번호</Label>
                  <Input
                    id="business_number"
                    value={businessNumber}
                    onChange={e => setBusinessNumber(e.target.value)}
                    placeholder="000-00-00000"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="memo">메모</Label>
                  <Input
                    id="memo"
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    placeholder="비고"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(null) }}>
                  취소
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? '등록 중...' : '등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">거래처명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">사업자번호</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-gray-400">
                    등록된 거래처가 없습니다.
                  </td>
                </tr>
              )}
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-4 py-3 text-gray-600">{v.business_number ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.memo ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
