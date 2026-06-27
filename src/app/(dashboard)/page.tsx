import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/utils/format'
import { Building2, FileText, TrendingDown, Wallet } from 'lucide-react'
import { SampleDashboard } from '@/components/sample/SampleDashboard'
import { DashboardRentalCard } from '@/components/dashboard/DashboardRentalCard'

// ── 묵시적 갱신 유효 만기일 계산 ───────────────────────────────
// 계약 만기가 지났으면 1년씩 더해 현재 이후가 될 때까지 반복
function calcEffectiveEndDate(endDateStr: string, now: Date): Date {
  const parts = endDateStr.split('-').map(Number)
  let d = new Date(parts[0], parts[1] - 1, parts[2])
  while (d <= now) {
    d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate())
  }
  return d
}

// 현재 → 유효 만기까지 남은 개월 수 (소수점 올림)
function monthsUntil(target: Date, now: Date): number {
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44))
}

// ── 연간 임대수익 (journal_entries 기준) ────────────────────────
async function getYearlyIncomeData(organizationId: string, year: number) {
  const supabase = await createClient()

  // 임대수익·관리비 유형의 승인 전표 라인 집계
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('entry_date, lines:journal_entry_lines(credit_amount)')
    .eq('organization_id', organizationId)
    .in('entry_type', ['임대수익', '관리비'])
    .eq('status', 'posted')
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)

  const quarterly = { q1: 0, q2: 0, q3: 0, q4: 0 }

  for (const entry of entries ?? []) {
    const month = parseInt((entry.entry_date as string).split('-')[1], 10)
    const qKey = `q${Math.ceil(month / 3)}` as keyof typeof quarterly
    // 수익 전표에서 credit 합계 = 수익 금액
    const income = ((entry.lines ?? []) as { credit_amount: number }[])
      .reduce((s, l) => s + l.credit_amount, 0)
    quarterly[qKey] += income
  }

  const yearTotal = quarterly.q1 + quarterly.q2 + quarterly.q3 + quarterly.q4
  return { yearTotal, quarterly }
}

// ── 연간 총비용 (account_type='비용' 기준, pl-stats 동일 방식) ──
async function getYearlyExpense(organizationId: string, year: number) {
  const supabase = await createClient()

  // 1단계: 해당 연도 posted 전표 ID 수집
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'posted')
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)

  if (!entries || entries.length === 0) return 0

  const ids = entries.map(e => e.id)

  // 2단계: 비용 계정과목 라인만 순액 합산
  const { data: lines } = await supabase
    .from('journal_entry_lines')
    .select('debit_amount, credit_amount, account:chart_of_accounts!account_id(account_type, normal_balance)')
    .in('journal_entry_id', ids)

  return (lines ?? []).reduce((total, line) => {
    const acct = (line.account as unknown) as { account_type: string; normal_balance: string } | null
    if (!acct || acct.account_type !== '비용') return total
    const net = acct.normal_balance === '차변'
      ? line.debit_amount - line.credit_amount
      : line.credit_amount - line.debit_amount
    return total + Math.max(0, net)
  }, 0)
}

// ── 보증금 잔액: 현재 활성 계약 보증금 합산 ─────────────────────
async function getDepositBalance(organizationId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lease_contracts')
    .select('deposit_amount')
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  return (data ?? []).reduce((s, c) => s + (c.deposit_amount ?? 0), 0)
}

// ── 기본 통계 ────────────────────────────────────────────────────
async function getBaseStats(organizationId: string) {
  const supabase = await createClient()

  const [properties, contracts] = await Promise.all([
    supabase.from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),

    supabase.from('lease_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
  ])

  const totalProperties = properties.count ?? 0
  const activeContracts = contracts.count ?? 0
  const occupancyRate = totalProperties > 0
    ? Math.round((activeContracts / totalProperties) * 100)
    : 0

  return { totalProperties, activeContracts, occupancyRate }
}

// ── 만기 임박 계약 (묵시적 갱신 반영, 월 기준 정렬) ──────────────
async function getExpiringContracts(organizationId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lease_contracts')
    .select(`
      id, lessee_name, monthly_rent, deposit_amount, end_date,
      property:properties!property_id (name)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  if (!data) return []

  const now = new Date()

  const withEffective = data.map(c => {
    const original = new Date(c.end_date)
    const effective = calcEffectiveEndDate(c.end_date, now)
    const isImplicit = effective.getFullYear() > original.getFullYear()
      || effective.getTime() !== original.getTime()
    const months = monthsUntil(effective, now)
    return { ...c, effective, isImplicit, months }
  })

  // 유효 만기가 가장 짧게 남은 순
  withEffective.sort((a, b) => a.effective.getTime() - b.effective.getTime())

  return withEffective.slice(0, 6)
}

// ── 페이지 ───────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SampleDashboard isGuest />

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { count: propCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile!.organization_id)

  if ((propCount ?? 0) === 0) return <SampleDashboard isGuest={false} />

  const orgId = profile!.organization_id
  const year  = new Date().getFullYear()

  const [baseStats, incomeData, totalExpense, depositBalance, expiringContracts] =
    await Promise.all([
      getBaseStats(orgId),
      getYearlyIncomeData(orgId, year),
      getYearlyExpense(orgId, year),
      getDepositBalance(orgId),
      getExpiringContracts(orgId),
    ])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">대시보드</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 보유 부동산 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">보유 부동산</p>
                <p className="text-2xl font-bold text-gray-900">{baseStats.totalProperties}건</p>
                <p className="text-xs text-gray-400 mt-1">임대 중 {baseStats.activeContracts}건</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 임대수익 — 클라이언트 인터랙티브 카드 */}
        <DashboardRentalCard
          yearTotal={incomeData.yearTotal}
          quarterly={incomeData.quarterly}
          year={year}
        />

        {/* 총비용 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{year}년 총비용</p>
                <p className="text-2xl font-bold text-gray-900">{formatKRW(totalExpense)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalExpense > 0 ? '비용지출 전표 합계' : '지출 없음'}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">{formatKRW(depositBalance)}</p>
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
          {expiringContracts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">활성 계약이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {expiringContracts.map(c => {
                const prop = (c.property as unknown as { name: string } | null)
                const effDateStr = c.effective.toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })
                const urgency = c.months <= 1 ? 'text-red-600 bg-red-50 border-red-200'
                  : c.months <= 3 ? 'text-orange-600 bg-orange-50 border-orange-200'
                  : 'text-gray-500 bg-gray-50 border-gray-200'

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2 px-1 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{c.lessee_name}</span>
                        {prop?.name && (
                          <span className="text-xs text-gray-400">{prop.name}</span>
                        )}
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
                          <span className="text-gray-300 ml-1">
                            (원계약 {c.end_date})
                          </span>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
