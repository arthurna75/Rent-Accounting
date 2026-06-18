'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Props {
  currentYear: number
}

export function DepreciationAction({ currentYear }: Props) {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleRun() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/accounting/depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? '처리 중 오류가 발생했습니다.' })
        return
      }
      const results: Array<{ property_name: string; status: string; amount: number }> = json.data ?? []
      const processed = results.filter(r => r.status === 'processed').length
      const skipped = results.filter(r => r.status === 'already_processed').length
      setMessage({
        type: 'success',
        text: `감가상각 분개가 생성되었습니다. (처리: ${processed}건${skipped > 0 ? `, 이미처리: ${skipped}건` : ''})`,
      })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">연도</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">월</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {months.map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
          <Button onClick={handleRun} disabled={loading}>
            {loading ? '처리 중...' : '이번 달 감가상각 처리'}
          </Button>
        </div>
        {message && (
          <p className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
