import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { SAMPLE_ORG } from '@/lib/sample-data'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인: 예시 모드 (전체 메뉴 노출)
  if (!user) {
    return (
      <DashboardShell
        user={null}
        organization={SAMPLE_ORG.name}
        isSampleMode
        isGuest
      >
        {children}
      </DashboardShell>
    )
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, organization:organizations!organization_id(*)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { count: propCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  const isSampleMode = (propCount ?? 0) === 0

  return (
    <DashboardShell
      user={{ email: user.email!, name: profile.full_name }}
      organization={((profile.organization as unknown) as { name: string }).name}
      role={profile.role}
      isSampleMode={isSampleMode}
      isGuest={false}
    >
      {children}
    </DashboardShell>
  )
}
