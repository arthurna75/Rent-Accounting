'use client'

import { SAMPLE_PL_STATS } from '@/lib/sample-data'
import { SampleBanner } from './SampleBanner'
import { PLStatsTable } from '@/app/(dashboard)/reports/pl-stats/PLStatsTable'

export function SamplePLStats({ isGuest = false }: { isGuest?: boolean }) {
  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <div>
        <h2 className="text-xl font-semibold text-gray-900">손익통계</h2>
        <p className="text-sm text-gray-500 mt-1">월별 수익·비용 현황을 한눈에 비교합니다.</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border rounded-md px-4 py-2">
        <span className="font-medium text-gray-700">{SAMPLE_PL_STATS.year}년</span>
        <span>· 예시 데이터</span>
      </div>
      <PLStatsTable data={SAMPLE_PL_STATS} />
    </div>
  )
}
