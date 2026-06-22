import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WizardClient } from './WizardClient'

export default async function WizardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'accountant'].includes(profile.role)) {
    redirect('/')
  }

  // 기존 건물 목록 (건물명 중복 제거)
  const { data: properties } = await supabase
    .from('properties')
    .select('id, building_name, unit_number, land_value, building_value, land_share_ratio, building_area, acquisition_date, is_active')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('building_name')
    .order('unit_number')

  // 계정과목 목록
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, normal_balance')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('code')

  // 해당 호실의 활성 계약
  const propIds = (properties ?? []).map(p => p.id)
  let contracts: { id: string; property_id: string; lessee_name: string; deposit_amount: number; monthly_rent: number; monthly_management_fee: number | null; start_date: string; end_date: string }[] = []
  if (propIds.length > 0) {
    const { data } = await supabase
      .from('lease_contracts')
      .select('id, property_id, lessee_name, deposit_amount, monthly_rent, monthly_management_fee, start_date, end_date')
      .in('property_id', propIds)
      .eq('status', 'active')
    contracts = data ?? []
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">복식부기 전환 마법사</h2>
        <p className="text-sm text-gray-500 mt-1">
          다세대주택 호실별 자산·임대현황을 입력하고 개시분개를 자동 생성합니다.
        </p>
      </div>
      <WizardClient
        existingProperties={properties ?? []}
        existingContracts={contracts}
        accounts={accounts ?? []}
      />
    </div>
  )
}
