import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/utils/format'
import { Building2, FileText, TrendingUp, AlertCircle, Wallet, PieChart } from 'lucide-react'

async function getDashboardStats(organizationId: string) {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`
  const toDate = `${year}-${String(month).padStart(2, '0')}-31`

  const [properties, contracts, unpaidRent, monthlyIncome, totalDeposit] = await Promise.all([
    supabase.from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),

    supabase.from('lease_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),

    supabase.from('rent_transactions')
      .select('amount, paid_amount')
      .eq('organization_id', organizationId)
      .in('status', ['unpaid', 'partial', 'overdue']),

    supabase.from('rent_transactions')
      .select('amount, vat_amount')
      .eq('organization_id', organizationId)
      .eq('billing_year', year)
      .eq('billing_month', month),

    supabase.from('deposit_transactions')
      .select('amount, transaction_type')
      .eq('organization_id', organizationId),
  ])

  const unpaidAmount = (unpaidRent.data ?? []).reduce(
    (s, r) => s + (r.amount - r.paid_amount), 0
  )

  const monthlyRentalIncome = (monthlyIncome.data ?? []).reduce(
    (s, r) => s + r.amount + r.vat_amount, 0
  )

  const depositBalance = (totalDeposit.data ?? []).reduce((s, r) => {
    if (['수령', '증액'].includes(r.transaction_type)) return s + r.amount
    return s - r.amount
  }, 0)

  const totalProperties = properties.count ?? 0
  const activeContracts = contracts.count ?? 0
  const occupancyRate = totalProperties > 0
    ? Math.round((activeContracts / totalProperties) * 100)
    : 0

  return {
    total_properties: totalProperties,
    active_contracts: activeContracts,
    monthly_rental_income: monthlyRentalIncome,
    unpaid_rent_amount: unpaidAmount,
    total_deposit: depositBalance,
    occupancy_rate: occupancyRate,
  }
}

async function getRecentContracts(organizationId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lease_contracts')
    .select('id, lessee_name, monthly_rent, deposit_amount, end_date, status, property:properties!property_id(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('end_date', { ascending: true })
    .limit(5)
  return data ?? []
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const [stats, recentContracts] = await Promise.all([
    getDashboardStats(profile!.organization_id),
    getRecentContracts(profile!.organization_id),
  ])

  const now = new Date()
  const currentMonth = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

  const statCards = [
    {
      title: '보유 부동산',
      value: `${stats.total_properties}건`,
      sub: `임대 중 ${stats.active_contracts}건`,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: `${currentMonth} 임대수익`,
      value: formatKRW(stats.monthly_rental_income),
      sub: `공실률 ${100 - stats.occupancy_rate}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: '미수임대료',
      value: formatKRW(stats.unpaid_rent_amount),
      sub: stats.unpaid_rent_amount > 0 ? '즉시 수금 필요' : '연체 없음',
      icon: AlertCircle,
      color: stats.unpaid_rent_amount > 0 ? 'text-red-600' : 'text-gray-400',
      bg: stats.unpaid_rent_amount > 0 ? 'bg-red-50' : 'bg-gray-50',
    },
    {
      title: '보증금 잔액',
      value: formatKRW(stats.total_deposit),
      sub: '반환 의무액',
      icon: Wallet,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  const daysUntilExpiry = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">대시보드</h2>

      {/* KPI Cards */}
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

      {/* 만기 임박 계약 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            만기 임박 계약
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentContracts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">만기 임박 계약이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {recentContracts.map(c => {
                const days = daysUntilExpiry(c.end_date)
                const prop = (c.property as unknown) as { name: string } | null
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {c.lessee_name}
                        <span className="ml-2 text-xs text-gray-400">{prop?.name}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        월세 {formatKRW(c.monthly_rent)} | 보증금 {formatKRW(c.deposit_amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">{c.end_date}</p>
                      <span className={`text-xs font-semibold ${
                        days <= 30 ? 'text-red-600' :
                        days <= 90 ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                        D{days >= 0 ? `-${days}` : `+${Math.abs(days)}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
