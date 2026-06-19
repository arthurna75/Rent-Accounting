import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GuestSettingsPrompt } from './GuestSettingsPrompt'
import type { Organization, UserProfile, SubscriptionPlan, UserRole } from '@/types/database'

const RENTAL_TYPE_LABEL: Record<string, string> = {
  주택: '주택임대',
  상가: '상가임대',
  혼합: '혼합(주택+상가)',
}

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const ROLE_LABEL: Record<UserRole, string> = {
  owner: '소유자',
  accountant: '회계담당자',
  viewer: '조회자',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b last:border-0">
      <dt className="w-36 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="flex-1 text-sm text-gray-900">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인: 게스트 안내 화면
  if (!user) return <GuestSettingsPrompt />

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, organization:organizations!organization_id(*)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const org = (profile.organization as unknown) as Organization
  const me = profile as UserProfile

  const planBadgeColor: Record<SubscriptionPlan, string> = {
    basic: 'bg-gray-100 text-gray-700',
    pro: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">설정</h2>

      {/* 사업자 정보 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">사업자 정보</CardTitle>
            <span className="text-xs text-gray-400">수정 기능 준비 중</span>
          </div>
        </CardHeader>
        <CardContent>
          <dl>
            <InfoRow label="상호명" value={org.name} />
            <InfoRow label="사업자등록번호" value={org.business_number ?? undefined} />
            <InfoRow label="대표자명" value={org.owner_name} />
            <InfoRow label="이메일" value={org.email} />
            <InfoRow label="연락처" value={org.phone ?? undefined} />
            <InfoRow label="주소" value={org.address ?? undefined} />
            <InfoRow label="임대 유형" value={RENTAL_TYPE_LABEL[org.rental_type] ?? org.rental_type} />
            <InfoRow label="회계연도 시작월" value={`${org.fiscal_year_start_month}월`} />
          </dl>
        </CardContent>
      </Card>

      {/* 계정 정보 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">계정 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <InfoRow label="이메일" value={user.email} />
            <InfoRow
              label="권한"
              value={
                <Badge variant="outline">
                  {ROLE_LABEL[me.role] ?? me.role}
                </Badge>
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* 구독 정보 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">구독 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <InfoRow
              label="구독 플랜"
              value={
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${planBadgeColor[org.subscription_plan]}`}
                >
                  {PLAN_LABEL[org.subscription_plan]}
                </span>
              }
            />
            <InfoRow
              label="만료일"
              value={
                org.subscription_expires_at
                  ? new Date(org.subscription_expires_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : undefined
              }
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
