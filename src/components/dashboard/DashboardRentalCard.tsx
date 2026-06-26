'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatKRW } from '@/lib/utils/format'
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  yearTotal: number
  quarterly: { q1: number; q2: number; q3: number; q4: number }
  year: number
}

export function DashboardRentalCard({ yearTotal, quarterly, year }: Props) {
  const [expanded, setExpanded] = useState(false)

  const quarters = [
    { label: '1분기 (1~3월)',   value: quarterly.q1 },
    { label: '2분기 (4~6월)',   value: quarterly.q2 },
    { label: '3분기 (7~9월)',   value: quarterly.q3 },
    { label: '4분기 (10~12월)', value: quarterly.q4 },
  ]

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow select-none"
      onClick={() => setExpanded(e => !e)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              {year}년 임대수익
              {expanded
                ? <ChevronUp className="w-3 h-3 text-gray-400" />
                : <ChevronDown className="w-3 h-3 text-gray-400" />
              }
            </p>
            <p className="text-2xl font-bold text-gray-900">{formatKRW(yearTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {expanded ? '클릭하여 닫기' : '클릭하면 분기별 조회'}
            </p>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                {quarters.map(q => (
                  <div key={q.label} className="bg-green-50/60 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-gray-400 whitespace-nowrap">{q.label}</p>
                    <p className="text-sm font-semibold text-green-700 mt-0.5 tabular-nums">
                      {formatKRW(q.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-green-50 ml-3 shrink-0">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
