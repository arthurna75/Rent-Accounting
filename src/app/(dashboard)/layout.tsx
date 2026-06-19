import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인: 예시 모드로 정상 레이아웃 렌더
  if (!user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isSampleMode />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header user={null} organization="예시 데이터" />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, organization:organizations!organization_id(*)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // 부동산이 없으면 예시 모드
  const { count: propCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  const isSampleMode = (propCount ?? 0) === 0

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={profile.role} isSampleMode={isSampleMode} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          user={{ email: user.email!, name: profile.full_name }}
          organization={((profile.organization as unknown) as { name: string }).name}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
