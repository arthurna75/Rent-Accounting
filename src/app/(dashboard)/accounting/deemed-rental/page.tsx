import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW, formatPercent } from '@/lib/utils/format'
import { DeemedRentalAction } from './DeemedRentalAction'

export default async function DeemedRentalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const currentYear = new Date().getFullYear()

  const { data: calcs } = await supabase
    .from('deemed_rental_calculations')
    .select(`
      *,
      contract:lease_contracts!contract_id (
        lessee_name, deposit_amount,
        property:properties!property_id (name)
      )
    `)
    .eq('organization_id', profile!.organization_id)
    .eq('fiscal_year', currentYear)
    .order('created_at', { ascending: false })

  const totalTaxable = calcs?.reduce((s, c) => s + (c.taxable_deemed_income ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">간주임대료 계산</h2>
        <p className="text-sm text-gray-500 mt-1">임대보증금에 대한 간주임대료를 계산하고 분개를 생성합니다.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-800">과세 기준 안내</CardTitle>
          <CardDescription className="text-blue-700">
            임대보증금이 기준금액(주택 3억원)을 초과하는 경우 초과분에 대해 기준이율을 적용하여 간주임대료를 과세표준에 포함합니다.
            <br />간주임대료 = (보증금 − 3억원) × 기준이율 × 임대일수 ÷ 365
          </CardDescription>
        </CardHeader>
      </Card>

      <DeemedRentalAction currentYear={currentYear} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{currentYear}년 간주임대료 계산 결과</CardTitle>
            {totalTaxable > 0 && (
              <span className="text-sm font-medium text-gray-700">
                과세대상 합계: <span className="text-blue-600 font-semibold">{formatKRW(totalTaxable)}</span>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {calcs && calcs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>부동산</TableHead>
                  <TableHead>임차인</TableHead>
                  <TableHead className="text-right">보증금</TableHead>
                  <TableHead className="text-right">과세대상보증금</TableHead>
                  <TableHead className="text-center">기준이율</TableHead>
                  <TableHead className="text-center">임대일수</TableHead>
                  <TableHead className="text-right">간주임대료</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calcs.map((c) => {
                  const contract = (c.contract as unknown) as {
                    lessee_name: string
                    deposit_amount: number
                    property: { name: string } | null
                  } | null
                  const taxableDeposit = Math.max(0, (contract?.deposit_amount ?? 0) - 300_000_000)
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{contract?.property?.name ?? '-'}</TableCell>
                      <TableCell>{contract?.lessee_name ?? '-'}</TableCell>
                      <TableCell className="text-right">{formatKRW(contract?.deposit_amount ?? 0)}</TableCell>
                      <TableCell className="text-right">
                        {taxableDeposit > 0 ? (
                          <span className="text-orange-600 font-medium">{formatKRW(taxableDeposit)}</span>
                        ) : (
                          <span className="text-gray-400">해당없음</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{formatPercent(c.standard_rate * 100, 1)}</TableCell>
                      <TableCell className="text-center">{c.rental_days}일</TableCell>
                      <TableCell className="text-right">
                        {c.taxable_deemed_income > 0 ? (
                          <span className="font-semibold text-blue-600">{formatKRW(c.taxable_deemed_income)}</span>
                        ) : (
                          <span className="text-gray-400">0원</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">
              {currentYear}년 간주임대료 계산 내역이 없습니다. 위에서 계산을 실행해 주세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
