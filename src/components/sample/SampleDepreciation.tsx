import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_DEPRECIATION } from '@/lib/sample-data'

export function SampleDepreciation({ isGuest }: { isGuest: boolean }) {
  const totalAnnual = SAMPLE_DEPRECIATION.reduce((s, r) => s + r.annual_depreciation, 0)
  const totalAccumulated = SAMPLE_DEPRECIATION.reduce((s, r) => s + r.accumulated, 0)

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <h2 className="text-xl font-semibold text-gray-900">감가상각 현황</h2>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '연간 감가상각 총액', value: formatKRW(totalAnnual) },
          { label: '누계 감가상각액',   value: formatKRW(totalAccumulated) },
          { label: '대상 부동산',       value: `${SAMPLE_DEPRECIATION.length}건` },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className="text-lg font-bold text-gray-900">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">부동산별 감가상각 명세</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>부동산</TableHead>
                <TableHead className="text-right">건물가액</TableHead>
                <TableHead className="text-center">내용연수</TableHead>
                <TableHead className="text-right">연간상각액</TableHead>
                <TableHead className="text-right">누계상각액</TableHead>
                <TableHead className="text-right">장부가액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_DEPRECIATION.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-800">{r.property_name}</TableCell>
                  <TableCell className="text-right text-gray-700">{formatKRW(r.building_value)}</TableCell>
                  <TableCell className="text-center text-gray-600">{r.useful_life}년</TableCell>
                  <TableCell className="text-right text-gray-700">{formatKRW(r.annual_depreciation)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatKRW(r.accumulated)}</TableCell>
                  <TableCell className="text-right font-semibold text-blue-700">{formatKRW(r.book_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
