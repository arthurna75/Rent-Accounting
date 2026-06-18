import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/utils/format'
import { DepreciationAction } from './DepreciationAction'

export default async function DepreciationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-gray-400">로그인 후 이용할 수 있습니다.</p>
    </div>
  )

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const currentYear = new Date().getFullYear()

  const { data: schedules } = await supabase
    .from('depreciation_schedules')
    .select('*, property:properties!property_id(name)')
    .eq('organization_id', profile!.organization_id)
    .eq('fiscal_year', currentYear)
    .order('period_month', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">감가상각 관리</h2>
        <p className="text-sm text-gray-500 mt-1">부동산별 월별 감가상각비를 계산하고 분개를 생성합니다.</p>
      </div>

      <DepreciationAction currentYear={currentYear} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{currentYear}년 감가상각 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {schedules && schedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>부동산</TableHead>
                  <TableHead className="text-center">월</TableHead>
                  <TableHead className="text-right">감가상각비</TableHead>
                  <TableHead className="text-right">누적 감가상각</TableHead>
                  <TableHead className="text-right">장부가액</TableHead>
                  <TableHead className="text-center">처리상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => {
                  const property = (s.property as unknown) as { name: string } | null
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{property?.name ?? '-'}</TableCell>
                      <TableCell className="text-center">{s.period_month}월</TableCell>
                      <TableCell className="text-right">{formatKRW(s.depreciation_amount ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatKRW(s.accumulated_depreciation ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatKRW(s.book_value ?? 0)}</TableCell>
                      <TableCell className="text-center">
                        {s.is_processed ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">처리완료</Badge>
                        ) : (
                          <Badge variant="secondary">미처리</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">
              {currentYear}년 감가상각 내역이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
