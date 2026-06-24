'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ExternalLink } from 'lucide-react'
import { formatKRW } from '@/lib/utils/format'

interface ContractEntry {
  id: string
  entry_date: string
  entry_type: string
  status: string
  description: string
  entry_number: string
  lines?: { debit_amount: number; credit_amount: number }[]
}

interface Props {
  contractId: string
  lesseeName: string
  entries: ContractEntry[]
}

export default function ExpenseSection({ contractId, entries }: Props) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">비용지출 내역</CardTitle>
          <Link
            href={`/accounting/journal/new?contract_id=${contractId}&entry_type=비용지출`}
            target="_self"
          >
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ExternalLink className="w-3.5 h-3.5" />
              비용지출 전표 등록
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">비용지출 내역이 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>날짜</TableHead>
                <TableHead>전표번호</TableHead>
                <TableHead>적요</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => {
                const total = (e.lines ?? []).reduce((s, l) => s + l.debit_amount, 0)
                const isDraft = e.status === 'draft'
                return (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer hover:bg-blue-50/40"
                    onClick={() => router.push(`/accounting/journal/${e.id}/edit`)}
                  >
                    <TableCell className="text-sm text-gray-600">{e.entry_date}</TableCell>
                    <TableCell className="text-sm text-gray-500">{e.entry_number}</TableCell>
                    <TableCell className="text-sm text-gray-700">{e.description}</TableCell>
                    <TableCell className="text-right font-medium text-gray-800">
                      {total > 0 ? formatKRW(total) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={isDraft
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-green-50 text-green-700 border-green-200'}
                      >
                        {isDraft ? '임시' : '확정'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell colSpan={3} className="text-sm text-gray-600">합계</TableCell>
                <TableCell className="text-right text-sm text-gray-900">
                  {formatKRW(entries.reduce((s, e) => s + (e.lines ?? []).reduce((ls, l) => ls + l.debit_amount, 0), 0))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
