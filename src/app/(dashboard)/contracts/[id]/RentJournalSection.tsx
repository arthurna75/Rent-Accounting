'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  lines?: { debit_amount: number; credit_amount: number }[]
}

interface RentTransaction {
  id: string
  billing_year: number
  billing_month: number
  amount: number
  vat_amount: number
  paid_amount: number
  status: string
}

interface Props {
  contractId: string
  monthlyRent: number
  managementFee: number | null
  lesseeName: string
  startDate: string
  endDate: string
  contractType: string
  paymentCondition: '선불' | '후불'
  rents: RentTransaction[]
  entries: ContractEntry[]
}

type RentEntryType = '임대수익' | '관리비'

interface InlineForm {
  rowKey: string
  date: string
  amount: string
  entryType: RentEntryType
}

function commaFmt(v: string) {
  const n = v.replace(/\D/g, '')
  return n ? Number(n).toLocaleString('ko-KR') : ''
}
function parseAmt(v: string) { return parseInt(v.replace(/\D/g, ''), 10) || 0 }

function yearMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function findRentEntries(rent: RentTransaction, entries: ContractEntry[]) {
  const ym = yearMonthKey(rent.billing_year, rent.billing_month)
  return entries.filter(
    e => e.entry_date.slice(0, 7) === ym && ['임대수익', '관리비'].includes(e.entry_type)
  )
}

function entryTotal(entry: ContractEntry) {
  return (entry.lines ?? []).reduce((s, l) => s + l.debit_amount, 0)
}

function AccountingInfo({ entry }: { entry: ContractEntry }) {
  const isDraft = entry.status === 'draft'
  const total = entryTotal(entry)
  return (
    <Link
      href={`/accounting/journal/${entry.id}/edit`}
      className="block text-xs space-y-0.5 text-left rounded hover:bg-gray-100 transition-colors p-0.5 -m-0.5"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <Badge
          variant="outline"
          className={isDraft
            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] py-0'
            : 'bg-green-50 text-green-700 border-green-200 text-[10px] py-0'}
        >
          {isDraft ? '임시' : '확정'}
        </Badge>
        <span className="text-gray-400">{entry.entry_date}</span>
      </div>
      <div className="text-gray-600 truncate max-w-[160px]">{entry.description}</div>
      {total > 0 && <div className="font-medium text-gray-800">{formatKRW(total)}</div>}
    </Link>
  )
}

function rentStatusLabel(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    unpaid:  { label: '미납',   className: 'bg-red-100 text-red-700 border-red-200' },
    partial: { label: '부분납', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    paid:    { label: '납부',   className: 'bg-green-100 text-green-700 border-green-200' },
    overdue: { label: '연체',   className: 'bg-red-200 text-red-800 border-red-300' },
  }
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' }
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>
}

export default function RentJournalSection({
  contractId, monthlyRent, managementFee, lesseeName,
  startDate, contractType, paymentCondition, rents, entries,
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState<InlineForm | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)

  const startDay = new Date(startDate).getDate()
  const isJeonse = contractType === '전세'

  function openForm(rowKey: string, year: number, month: number, defaultAmount: number, defaultType: RentEntryType) {
    if (form?.rowKey === rowKey) {
      setForm(null)
      setError(null)
    } else {
      const dayStr = String(Math.min(startDay, new Date(year, month, 0).getDate())).padStart(2, '0')
      const date = `${yearMonthKey(year, month)}-${dayStr}`
      setForm({ rowKey, date, amount: defaultAmount.toLocaleString('ko-KR'), entryType: defaultType })
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

  async function handleBulk() {
    setBulkLoading(true)
    setBulkMsg(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '실패')
      const errCount = json.errors?.length ?? 0
      setBulkMsg(errCount > 0 ? `${json.created}건 생성됨 (실패 ${errCount}건: ${json.errors[0]})` : `${json.created}건 생성됨`)
      router.refresh()
    } catch (e) {
      setBulkMsg(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">임대료 청구 내역</CardTitle>
            {!isJeonse && (
              <Badge variant="outline" className={paymentCondition === '후불'
                ? 'text-orange-700 border-orange-200 bg-orange-50 text-[10px] py-0'
                : 'text-blue-700 border-blue-200 bg-blue-50 text-[10px] py-0'}
              >
                {paymentCondition}
              </Badge>
            )}
          </div>
          {!isJeonse && (
            <div className="flex items-center gap-2">
              {bulkMsg && <span className="text-xs text-gray-500">{bulkMsg}</span>}
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleBulk}
                disabled={bulkLoading}
              >
                {bulkLoading ? '생성 중...' : '전체 기간 임대료 생성'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rents.length === 0 && entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">임대료 청구 내역이 없습니다.</p>
        ) : rents.length === 0 ? (
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
                const total = entryTotal(e)
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
                    <TableCell className="text-right font-medium text-gray-800">{total > 0 ? formatKRW(total) : '—'}</TableCell>
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
                  {formatKRW(entries.reduce((s, e) => s + entryTotal(e), 0))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>청구년월</TableHead>
                <TableHead className="text-right">임대료</TableHead>
                <TableHead className="text-right">부가세</TableHead>
                <TableHead className="text-right">납부금액</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-center">회계처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rents.map(r => {
                const matched = findRentEntries(r, entries)
                const rowKey = r.id
                return (
                  <>
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-gray-700">
                        {r.billing_year}년 {r.billing_month}월
                      </TableCell>
                      <TableCell className="text-right text-gray-700">{formatKRW(r.amount)}</TableCell>
                      <TableCell className="text-right text-gray-500">{formatKRW(r.vat_amount)}</TableCell>
                      <TableCell className="text-right font-medium text-gray-800">
                        {formatKRW(r.paid_amount)}
                      </TableCell>
                      <TableCell className="text-center">{rentStatusLabel(r.status)}</TableCell>
                      <TableCell className="text-center">
                        {matched.length > 0 ? (
                          <div className="space-y-1.5">
                            {matched.map(e => <AccountingInfo key={e.id} entry={e} />)}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">미처리</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => openForm(rowKey, r.billing_year, r.billing_month, monthlyRent, '임대수익')}
                            >
                              전표 생성
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {form?.rowKey === rowKey && (
                      <TableRow key={`${r.id}-form`}>
                        <TableCell colSpan={6} className="bg-gray-50 p-4">
                          <InlineFormPanel
                            form={form}
                            setForm={setForm}
                            submitting={submitting}
                            error={error}
                            onSubmit={handleSubmit}
                            onCancel={() => { setForm(null); setError(null) }}
                            managementFee={managementFee}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell colSpan={3} className="text-sm text-gray-600">합계</TableCell>
                <TableCell className="text-right text-sm text-gray-900">
                  {formatKRW(rents.reduce((s, r) => s + r.paid_amount, 0))}
                </TableCell>
                <TableCell />
                <TableCell className="text-right text-sm text-gray-900 pr-4">
                  전표 {formatKRW(entries.reduce((s, e) => s + entryTotal(e), 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function InlineFormPanel({
  form, setForm, submitting, error, onSubmit, onCancel, managementFee,
}: {
  form: InlineForm
  setForm: (f: InlineForm) => void
  submitting: boolean
  error: string | null
  onSubmit: () => void
  onCancel: () => void
  managementFee: number | null
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
            onValueChange={v => setForm({ ...form, entryType: v as RentEntryType })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="임대수익">임대수익</SelectItem>
              {managementFee != null && managementFee > 0 && (
                <SelectItem value="관리비">관리비</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
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
