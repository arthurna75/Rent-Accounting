import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/utils/format'
import { Building2, FileText, TrendingUp, AlertCircle, Wallet } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_STATS, SAMPLE_EXPIRING_CONTRACTS } from '@/lib/sample-data'

export function SampleDashboard({ isGuest }: { isGuest: boolean }) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

  const statCards = [
    { title: '보유 부동산', value: `${SAMPLE_STATS.total_properties}건`, sub: `임대 중 ${SAMPLE_STATS.active_contracts}건`, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: `${currentMonth} 임대수익`, value: formatKRW(SAMPLE_STATS.monthly_rental_income), sub: `공실률 ${100 - SAMPLE_STATS.occupancy_rate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: '미수임대료', value: formatKRW(SAMPLE_STATS.unpaid_rent_amount), sub: '즉시 수금 필요', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { title: '보증금 잔액', value: formatKRW(SAMPLE_STATS.total_deposit), sub: '반환 의무액', icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

  return (
    <div className="space-y-6">
      <SampleBanner isGuest={isGuest} />
      <h2 className="text-xl font-semibold text-gray-900">대시보드</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Card key={card.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            만기 임박 계약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SAMPLE_EXPIRING_CONTRACTS.map(c => {
              const days = daysUntil(c.end_date)
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {c.lessee_name}
                      <span className="ml-2 text-xs text-gray-400">{c.property_name}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      월세 {formatKRW(c.monthly_rent)} | 보증금 {formatKRW(c.deposit_amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">{c.end_date}</p>
                    <span className={`text-xs font-semibold ${days <= 90 ? 'text-orange-500' : 'text-gray-400'}`}>
                      D{days >= 0 ? `-${days}` : `+${Math.abs(days)}`}
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
