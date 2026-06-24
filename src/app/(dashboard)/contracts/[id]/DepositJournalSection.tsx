'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'

interface ContractEntry {
  id: string
  entry_date: string
  entry_type: string
  status: string
  description: string
  entry_number: string
}

interface DepositTx {
  id: string
  transaction_date: string
  transaction_type: '수령' | '반환' | '증액' | '감액'
  amount: number
  notes: string | null
}

interface Props {
  contractId: string
  depositAmount: number
  lesseeName: string
  deposits: DepositTx[]
  entries: ContractEntry[]
}

type EntryType = '보증금수령' | '보증금반환'

interface InlineForm {
  rowKey: string
  date: string
  amount: string
  entryType: EntryType
}

function toEntryType(txType: DepositTx['transaction_type']): EntryType {
  return ['수령', '증액'].includes(txType) ? '보증금수령' : '보증금반환'
}

function findMatchingEntry(tx: DepositTx, entries: ContractEntry[]): ContractEntry | null {
  const expectedType = toEntryType(tx.transaction_type)
  return entries.find(
    e => e.entry_type === expectedType && e.entry_date === tx.transaction_date
  ) ?? null
}

function commaFmt(v: string) {
  const n = v.replace(/\D/g, '')
  return n ? Number(n).toLocaleString('ko-KR') : ''
}
function parseAmt(v: string) { return parseInt(v.replace(/\D/g, ''), 10) || 0 }

export default function DepositJournalSection({
  contractId, depositAmount, lesseeName, deposits, entries,
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState<InlineForm | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openForm(rowKey: string, date: string, amount: number, entryType: EntryType) {
    if (form?.rowKey === rowKey) {
      setForm(null)
      setError(null)
    } else {
      setForm({ rowKey, date, amount: amount.toLocaleString('ko-KR'), entryType })
      setError(null)
    }
  }

  async function handleSubmit() {
    if (!form) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: form.entryType,
          amount: parseAmt(form.amount),
          entry_date: form.date,
          description: `${lesseeName} ${form.entryType}`,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '등록 실패')
      }
      setForm(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // deposits가 비어있고 depositAmount > 0인 경우 처리
  const showFallback = deposits.length === 0 && depositAmount > 0
  const fallbackKey = 'fallback'
  const fallbackMatched = entries.find(e => e.entry_type === '보증금수령') ?? null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">보증금 거래 내역</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {showFallback ? (
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                계약 보증금 {formatKRW(depositAmount)} —
              </span>
              {fallbackMatched ? (
                <AccountingBadge entry={fallbackMatched} />
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">미처리</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => openForm(
                      fallbackKey,
                      new Date().toISOString().slice(0, 10),
                      depositAmount,
                      '보증금수령',
                    )}
                  >
                    전표 생성
                  </Button>
                </div>
              )}
            </div>
            {form?.rowKey === fallbackKey && (
              <InlineFormPanel
                form={form}
                setForm={setForm}
                submitting={submitting}
                error={error}
                onSubmit={handleSubmit}
                onCancel={() => { setForm(null); setError(null) }}
              />
            )}
          </div>
        ) : deposits.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">보증금 거래 내역이 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>날짜</TableHead>
                <TableHead>구분</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="text-center">회계처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map(d => {
                const matched = findMatchingEntry(d, entries)
                const rowKey = d.id
                return (
                  <>
                    <TableRow key={d.id}>
                      <TableCell className="text-sm text-gray-600">{d.transaction_date}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ['수령', '증액'].includes(d.transaction_type)
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }
                        >
                          {d.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-800">
                        {formatKRW(d.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{d.notes ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        {matched ? (
                          <AccountingBadge entry={matched} />
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">미처리</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => openForm(rowKey, d.transaction_date, d.amount, toEntryType(d.transaction_type))}
                            >
                              전표 생성
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {form?.rowKey === rowKey && (
                      <TableRow key={`${d.id}-form`}>
                        <TableCell colSpan={5} className="bg-gray-50 p-4">
                          <InlineFormPanel
                            form={form}
                            setForm={setForm}
                            submitting={submitting}
                            error={error}
                            onSubmit={handleSubmit}
                            onCancel={() => { setForm(null); setError(null) }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function AccountingBadge({ entry }: { entry: ContractEntry }) {
  const isDraft = entry.status === 'draft'
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

function InlineFormPanel({
  form, setForm, submitting, error, onSubmit, onCancel,
}: {
  form: InlineForm
  setForm: (f: InlineForm) => void
  submitting: boolean
  error: string | null
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-medium text-blue-800">전표 생성</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">날짜</Label>
          <Input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">금액</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: commaFmt(e.target.value) })}
            className="h-8 text-sm text-right"
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">전표유형</Label>
          <Select
            value={form.entryType}
            onValueChange={v => setForm({ ...form, entryType: v as EntryType })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="보증금수령">보증금수령</SelectItem>
              <SelectItem value="보증금반환">보증금반환</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSubmit} disabled={submitting}>
          {submitting ? '등록 중...' : '등록'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          취소
        </Button>
      </div>
    </div>
  )
}
