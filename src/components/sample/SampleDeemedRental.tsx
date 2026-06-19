import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_DEEMED_RENTAL } from '@/lib/sample-data'

const BASE_RATE = 2.9

export function SampleDeemedRental({ isGuest }: { isGuest: boolean }) {
  const totalTaxable = SAMPLE_DEEMED_RENTAL.reduce((s, r) => s + r.taxable_rent, 0)

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">간주임대료 계산</h2>
        <span className="text-sm text-gray-500">기준이율 {BASE_RATE}% (2026년 국세청 고시)</span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">계약별 간주임대료 계산 결과</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>임차인</TableHead>
                <TableHead>부동산</TableHead>
                <TableHead>계약유형</TableHead>
                <TableHead className="text-right">보증금</TableHead>
                <TableHead className="text-center">임대일수</TableHead>
                <TableHead className="text-right">간주임대료</TableHead>
                <TableHead className="text-right">과세대상</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_DEEMED_RENTAL.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-800">{r.lessee_name}</TableCell>
                  <TableCell className="text-gray-700">{r.property_name}</TableCell>
                  <TableCell className="text-gray-600">{r.contract_type}</TableCell>
                  <TableCell className="text-right text-gray-700">{formatKRW(r.deposit_amount)}</TableCell>
                  <TableCell className="text-center text-gray-600">{r.days}일</TableCell>
                  <TableCell className="text-right text-gray-700">{formatKRW(r.deemed_rent)}</TableCell>
                  <TableCell className="text-right">
                    {r.taxable_rent > 0
                      ? <span className="font-semibold text-red-600">{formatKRW(r.taxable_rent)}</span>
                      : <span className="text-gray-400">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">과세 간주임대료 합계</p>
              <p className="text-xs text-blue-600 mt-0.5">주택 임대소득 신고 시 합산 대상</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatKRW(totalTaxable)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
