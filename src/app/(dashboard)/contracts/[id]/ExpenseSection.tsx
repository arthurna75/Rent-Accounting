'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ExternalLink } from 'lucide-react'

interface ContractEntry {
  id: string
  entry_date: string
  entry_type: string
  status: string
  description: string
  entry_number: string
}

interface Props {
  contractId: string
  lesseeName: string
  entries: ContractEntry[]
}

function statusBadge(status: string) {
  const isDraft = status === 'draft'
  return (
    <Badge
      variant="outline"
      className={isDraft
        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
        : 'bg-green-50 text-green-700 border-green-200'}
    >
      {isDraft ? '임시' : '확정'}
    </Badge>
  )
}

export default function ExpenseSection({ contractId, entries }: Props) {
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
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm text-gray-600">{e.entry_date}</TableCell>
                  <TableCell className="text-sm text-gray-500">{e.entry_number}</TableCell>
                  <TableCell>
                    <Link
                      href={`/accounting/journal/${e.id}/edit`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {e.description}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{statusBadge(e.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
