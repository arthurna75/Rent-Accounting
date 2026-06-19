import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_COA } from '@/lib/sample-data'

const TYPE_COLOR: Record<string, string> = {
  자산: 'bg-blue-50 text-blue-700 border-blue-200',
  부채: 'bg-orange-50 text-orange-700 border-orange-200',
  자본: 'bg-purple-50 text-purple-700 border-purple-200',
  수익: 'bg-green-50 text-green-700 border-green-200',
  비용: 'bg-red-50 text-red-700 border-red-200',
}

const TYPES = ['자산', '부채', '자본', '수익', '비용'] as const

export function SampleChartOfAccounts({ isGuest }: { isGuest: boolean }) {
  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <h2 className="text-xl font-semibold text-gray-900">계정과목 관리</h2>
      {TYPES.map(type => {
        const rows = SAMPLE_COA.filter(c => c.account_type === type)
        if (rows.length === 0) return null
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Badge variant="outline" className={TYPE_COLOR[type]}>{type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-24">계정코드</TableHead>
                    <TableHead>계정명</TableHead>
                    <TableHead className="text-center">잔액방향</TableHead>
                    <TableHead className="text-center">구분</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(c => (
                    <TableRow key={c.code}>
                      <TableCell className="font-mono text-sm text-gray-500">{c.code}</TableCell>
                      <TableCell className="font-medium text-gray-800">{c.name}</TableCell>
                      <TableCell className="text-center text-sm text-gray-600">{c.normal_balance}</TableCell>
                      <TableCell className="text-center">
                        {c.is_system
                          ? <Badge variant="secondary" className="text-xs">시스템</Badge>
                          : <Badge variant="outline" className="text-xs">사용자</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
