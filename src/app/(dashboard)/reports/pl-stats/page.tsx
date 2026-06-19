import { createClient } from '@/lib/supabase/server'
import { PLStatsClient } from './PLStatsClient'
import { SamplePLStats } from '@/components/sample/SamplePLStats'

export default async function PLStatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SamplePLStats isGuest />

  // 부동산 등록 여부 확인 (샘플 모드 판별)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return <SamplePLStats isGuest={false} />

  const { count: propCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  if ((propCount ?? 0) === 0) return <SamplePLStats isGuest={false} />

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">손익통계</h2>
        <p className="text-sm text-gray-500 mt-1">월별 수익·비용 현황을 한눈에 비교합니다.</p>
      </div>
      <PLStatsClient currentYear={currentYear} />
    </div>
  )
}
