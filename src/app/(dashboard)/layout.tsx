import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { LoginModal } from '@/components/auth/LoginModal'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인: children 렌더링 없이 팝업만 표시 (children 내부 user!.id 접근 방지)
  if (!user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <LoginModal open={true} description="데이터를 저장하거나 조회하려면 로그인하세요." />
        <div className="w-56 bg-white border-r border-gray-200" />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="h-14 border-b border-gray-200 bg-white" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-400">로그인 후 이용할 수 있습니다.</p>
            </div>
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={profile.role} />
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
