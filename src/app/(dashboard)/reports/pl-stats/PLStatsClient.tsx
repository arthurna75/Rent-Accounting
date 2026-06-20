'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PrintButton } from '@/components/ui/PrintButton'
import { PLStatsTable, type PLStatsData } from './PLStatsTable'

interface Props {
  currentYear: number
}

export function PLStatsClient({ currentYear }: Props) {
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<PLStatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  async function fetchData(y: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/pl-stats?year=${y}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '조회에 실패했습니다.')
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 진입 시 현재 연도 자동 조회
  useEffect(() => { fetchData(currentYear) }, [currentYear])

  return (
    <div className="space-y-5">
      {/* 연도 선택 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">연도</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>
        <Button onClick={() => fetchData(year)} disabled={loading} size="sm">
          {loading ? '조회 중...' : '조회'}
        </Button>
        {data && !loading && <PrintButton />}
        {data && !loading && (
          <span className="text-xs text-gray-400">
            수익·비용 행 제목을 클릭하면 항목을 접거나 펼칠 수 있습니다.
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          데이터를 불러오는 중...
        </div>
      )}

      {!loading && data && (
        data.revenues.length === 0 && data.expenses.length === 0 ? (
          <div className="rounded-md border bg-gray-50 py-16 text-center text-sm text-gray-400">
            {data.year}년에 등록된 전표(posted) 데이터가 없습니다.
          </div>
        ) : (
          <PLStatsTable data={data} />
        )
      )}
    </div>
  )
}
