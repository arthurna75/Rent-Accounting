import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'
import { PlusCircle } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_JOURNAL_ENTRIES } from '@/lib/sample-data'

export function SampleJournal({ isGuest }: { isGuest: boolean }) {
  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">분개장</h2>
        <Link href={isGuest ? '/register' : '/accounting/journal/new'}>
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="w-4 h-4" />
            전표 등록
          </Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>전표번호</TableHead>
                <TableHead>거래일</TableHead>
                <TableHead>적요</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">차변</TableHead>
                <TableHead className="text-right">대변</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_JOURNAL_ENTRIES.map(e => (
                <TableRow key={e.id} className="hover:bg-blue-50/40">
                  <TableCell className="font-mono text-xs text-gray-600">{e.entry_number}</TableCell>
                  <TableCell className="text-xs text-gray-600">{e.entry_date}</TableCell>
                  <TableCell className="text-sm text-gray-800">{e.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{e.entry_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-700">{formatKRW(e.total_debit)}</TableCell>
                  <TableCell className="text-right text-sm text-gray-700">{formatKRW(e.total_credit)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">승인</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
