import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { AccountType } from '@/types/database'

type Account = {
  id: string
  code: string
  name: string
  account_type: AccountType
  account_subtype: string | null
  normal_balance: '차변' | '대변'
  is_system: boolean
  is_active: boolean
}

const ACCOUNT_TYPE_ORDER: AccountType[] = ['자산', '부채', '자본', '수익', '비용']

export default async function ChartOfAccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('organization_id', profile!.organization_id)
    .order('code', { ascending: true })

  const accountList = (accounts ?? []) as Account[]

  const grouped: Record<AccountType, Account[]> = {
    자산: [],
    부채: [],
    자본: [],
    수익: [],
    비용: [],
  }

  for (const account of accountList) {
    if (grouped[account.account_type]) {
      grouped[account.account_type].push(account)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">계정과목</h2>
        <p className="text-sm text-gray-500 mt-1">조직의 계정과목 목록을 유형별로 확인합니다.</p>
      </div>

      {ACCOUNT_TYPE_ORDER.map((type) => {
        const list = grouped[type]
        if (list.length === 0) return null

        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{type}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">코드</TableHead>
                    <TableHead>계정명</TableHead>
                    <TableHead>세부유형</TableHead>
                    <TableHead className="text-center">잔액방향</TableHead>
                    <TableHead className="text-center">시스템계정</TableHead>
                    <TableHead className="text-center">활성</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.code}</TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {account.account_subtype ?? '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {account.normal_balance === '차변' ? (
                          <span className="text-blue-600 font-medium text-sm">차변</span>
                        ) : (
                          <span className="text-orange-500 font-medium text-sm">대변</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {account.is_system ? (
                          <Badge variant="secondary">시스템</Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {account.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            활성
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            비활성
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}

      {accountList.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-400">
            등록된 계정과목이 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
