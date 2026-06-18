'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Props {
  currentYear: number
}

export function DeemedRentalAction({ currentYear }: Props) {
  const router = useRouter()
  const [year, setYear] = useState(currentYear)
  const [createJournal, setCreateJournal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleRun() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/accounting/deemed-rental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, create_journal: createJournal }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? '처리 중 오류가 발생했습니다.' })
        return
      }
      const contracts: Array<{ lessee_name: string; taxable_deemed_income: number }> = json.data?.contracts ?? []
      const total = contracts.reduce((s, c) => s + c.taxable_deemed_income, 0)
      setMessage({
        type: 'success',
        text: `${year}년 간주임대료 계산 완료. 과세대상 합계: ${total.toLocaleString('ko-KR')}원 (${contracts.length}건)`,
      })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">과세연도</label>
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
          <div className="flex items-center gap-2 pb-0.5">
            <input
              type="checkbox"
              id="create-journal"
              checked={createJournal}
              onChange={e => setCreateJournal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="create-journal" className="text-sm text-gray-700 cursor-pointer">
              분개 자동 생성
            </label>
          </div>
          <Button onClick={handleRun} disabled={loading}>
            {loading ? '계산 중...' : '계산 실행'}
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
