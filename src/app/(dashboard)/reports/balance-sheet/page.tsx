import { createClient } from '@/lib/supabase/server'
import { BalanceSheetClient } from './BalanceSheetClient'
import { SampleBalanceSheet } from '@/components/sample/SampleReports'

export default async function BalanceSheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SampleBalanceSheet isGuest />

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">재무상태표</h2>
        <p className="text-sm text-gray-500 mt-1">특정 기준일 현재의 자산, 부채, 자본 현황을 나타냅니다.</p>
      </div>
      <BalanceSheetClient defaultDate={today} />
    </div>
  )
}
