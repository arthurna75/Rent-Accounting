import { createClient } from '@/lib/supabase/server'
import { SampleChartOfAccounts } from '@/components/sample/SampleChartOfAccounts'
import { ChartOfAccountsClient, type Account } from './ChartOfAccountsClient'

export default async function ChartOfAccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SampleChartOfAccounts isGuest />

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return <SampleChartOfAccounts isGuest={false} />

  // 활성·비활성 모두 로드 (클라이언트에서 토글 즉시 반영)
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, account_subtype, normal_balance, is_system, is_active, description')
    .eq('organization_id', profile.organization_id)
    .order('code', { ascending: true })

  const list = (accounts ?? []) as Account[]
  if (list.length === 0) return <SampleChartOfAccounts isGuest={false} />

  return <ChartOfAccountsClient initial={list} />
}
