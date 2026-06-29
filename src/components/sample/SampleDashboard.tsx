'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/utils/format'
import { Building2, FileText, TrendingDown, Wallet } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_STATS, SAMPLE_EXPIRING_CONTRACTS, SAMPLE_DASHBOARD_RENTAL, SAMPLE_PL_STATS } from '@/lib/sample-data'
import { DashboardRentalCard } from '@/components/dashboard/DashboardRentalCard'

function calcEffectiveEndDate(endDateStr: string, now: Date): Date {
  const parts = endDateStr.split('-').map(Number)
  let d = new Date(parts[0], parts[1] - 1, parts[2])
  while (d <= now) {
    d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate())
  }
  return d
}

function monthsUntil(target: Date, now: Date): number {
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44))
}

export function SampleDashboard({ isGuest }: { isGuest: boolean }) {
  const year = SAMPLE_DASHBOARD_RENTAL.year

  const now = new Date()
  const expiringContracts = SAMPLE_EXPIRING_CONTRACTS.map(c => {
    const effective = calcEffectiveEndDate(c.end_date, now)
    const original = new Date(c.end_date)
    const isImplicit = effective.getTime() !== original.getTime()
    const months = monthsUntil(effective, now)
    return { ...c, effective, isImplicit, months }
  }).sort((a, b) => a.effective.getTime() - b.effective.getTime())

  return (
    <div className="space-y-6">
      <SampleBanner isGuest={isGuest} />
      <h2 className="text-xl font-semibold text-gray-900">대시보드</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 보유 부동산 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">보유 부동산</p>
                <p className="text-2xl font-bold text-gray-900">{SAMPLE_STATS.total_properties}건</p>
                <p className="text-xs text-gray-400 mt-1">임대 중 {SAMPLE_STATS.active_contracts}건</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 임대수익 — 분기 드롭다운 인터랙티브 카드 */}
        <DashboardRentalCard
          yearTotal={SAMPLE_DASHBOARD_RENTAL.yearTotal}
          quarterly={SAMPLE_DASHBOARD_RENTAL.quarterly}
          year={year}
        />

        {/* 총비용 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{year}년 총비용</p>
                <p className="text-2xl font-bold text-gray-900">{formatKRW(SAMPLE_PL_STATS.total_expense)}</p>
                <p className="text-xs text-gray-400 mt-1">비용지출 전표 합계</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 보증금 잔액 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">보증금 잔액</p>
                <p className="text-2xl font-bold text-gray-900">{formatKRW(SAMPLE_STATS.total_deposit)}</p>
                <p className="text-xs text-gray-400 mt-1">활성 계약 전체 · 반환 의무액</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-50">
                <Wallet className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 만기 임박 계약 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            만기 임박 계약
            <span className="text-xs font-normal text-gray-400 ml-1">
              · 묵시적 갱신 반영 — 만기가 경과하면 1년씩 자동 연장, 월 기준 오름차순 정렬
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expiringContracts.map(c => {
              const effDateStr = c.effective.toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })
              const urgency = c.months <= 1
                ? 'text-red-600 bg-red-50 border-red-200'
                : c.months <= 3
                ? 'text-orange-600 bg-orange-50 border-orange-200'
                : 'text-gray-500 bg-gray-50 border-gray-200'

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 px-1 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{c.lessee_name}</span>
                      <span className="text-xs text-gray-400">{c.property_name}</span>
                      {c.isImplicit && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                          묵시적갱신
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      월세 {formatKRW(c.monthly_rent)} · 보증금 {formatKRW(c.deposit_amount)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      유효만기 {effDateStr}
                      {c.isImplicit && (
                        <span className="text-gray-300 ml-1">(원계약 {c.end_date})</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${urgency}`}>
                      {c.months <= 0 ? '이번달 만기' : `${c.months}개월`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
