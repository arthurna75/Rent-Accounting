import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatKRW, formatDate } from '@/lib/utils/format'
import { ArrowLeft } from 'lucide-react'
import { JournalActions } from './JournalActions'
import { JournalAttachmentPanel } from './JournalAttachmentPanel'

type EntryLine = {
  id: string
  account: { code: string; name: string; account_type: string } | null
  debit_amount: number
  credit_amount: number
  description: string | null
}

type EntryDetail = {
  id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: string
  status: 'draft' | 'posted' | 'reversed'
  is_reversed: boolean
  reversed_by: string | null
  reference_id: string | null
  reference_type: string | null
  created_at: string
  approved_at: string | null
  attachment_urls: string[] | null
  lines: EntryLine[]
}

const statusBadgeClass: Record<EntryDetail['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  posted: 'bg-green-100 text-green-700',
  reversed: 'bg-red-100 text-red-700',
}

const statusLabel: Record<EntryDetail['status'], string> = {
  draft: '초안',
  posted: '승인완료',
  reversed: '역분개됨',
}

const accountTypeColor: Record<string, string> = {
  asset: 'text-blue-700',
  liability: 'text-red-700',
  equity: 'text-purple-700',
  revenue: 'text-green-700',
  expense: 'text-orange-700',
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) notFound()

  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      id, entry_number, entry_date, description, entry_type, status,
      is_reversed, reversed_by, reference_id, reference_type,
      created_at, approved_at, attachment_urls, organization_id,
      lines:journal_entry_lines (
        id, debit_amount, credit_amount, description,
        account:chart_of_accounts!account_id (code, name, account_type)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const entry = data as unknown as EntryDetail & { organization_id: string }

  if (entry.organization_id !== profile.organization_id) notFound()

  const canApprove = profile.role === 'owner' || profile.role === 'accountant'

  const totalDebit = entry.lines.reduce((s, l) => s + (l.debit_amount ?? 0), 0)
  const totalCredit = entry.lines.reduce((s, l) => s + (l.credit_amount ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 뒤로가기 */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounting/journal">
            <ArrowLeft className="w-4 h-4 mr-1" />
            분개장
          </Link>
        </Button>
      </div>

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-gray-900">
            {entry.entry_number}
          </h2>
          <span className="text-sm text-gray-500">{formatDate(entry.entry_date)}</span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[entry.status]}`}
          >
            {statusLabel[entry.status]}
          </span>
        </div>
      </div>

      {/* 정보 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">전표 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-xs text-gray-500">분개유형</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{entry.entry_type}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">적요</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{entry.description || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">등록일</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{formatDate(entry.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">승인일</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {entry.approved_at ? formatDate(entry.approved_at) : '-'}
              </dd>
            </div>
            {entry.reference_type === 'journal_entries' && entry.reference_id && (
              <div>
                <dt className="text-xs text-gray-500">원전표</dt>
                <dd className="mt-0.5 text-sm font-medium text-blue-700">
                  <Link
                    href={`/accounting/journal/${entry.reference_id}`}
                    className="hover:underline"
                  >
                    [원전표: {entry.reference_id}]
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* 분개 명세 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">분개 명세</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">계정코드</TableHead>
                <TableHead>계정명</TableHead>
                <TableHead className="text-right">차변</TableHead>
                <TableHead className="text-right">대변</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map(line => {
                const colorClass =
                  accountTypeColor[line.account?.account_type ?? ''] ?? 'text-gray-900'
                return (
                  <TableRow key={line.id}>
                    <TableCell className={`font-mono text-xs ${colorClass}`}>
                      {line.account?.code ?? '-'}
                    </TableCell>
                    <TableCell className={`text-sm ${colorClass}`}>
                      {line.account?.name ?? '-'}
                      {line.description && (
                        <span className="ml-2 text-xs text-gray-400">{line.description}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {line.debit_amount ? formatKRW(line.debit_amount) : ''}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {line.credit_amount ? formatKRW(line.credit_amount) : ''}
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* 합계 행 */}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell colSpan={2} className="text-sm text-right text-gray-600">
                  합계
                </TableCell>
                <TableCell className="text-right text-sm">{formatKRW(totalDebit)}</TableCell>
                <TableCell className="text-right text-sm">{formatKRW(totalCredit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 첨부 파일 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">첨부 파일</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalAttachmentPanel
            entryId={entry.id}
            initialUrls={entry.attachment_urls ?? []}
            canEdit={canApprove && entry.status !== 'reversed'}
          />
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <Card>
        <CardContent className="pt-4">
          <JournalActions
            entryId={entry.id}
            status={entry.status}
            isReversed={entry.is_reversed}
            canApprove={canApprove}
          />
        </CardContent>
      </Card>
    </div>
  )
}
