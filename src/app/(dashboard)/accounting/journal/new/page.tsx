'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { JournalEntryType } from '@/types/database'

interface JournalLine {
  account_code: string
  account_name: string
  debit_amount: string
  credit_amount: string
}

const ENTRY_TYPES: JournalEntryType[] = [
  '일반', '임대수익', '보증금수령', '보증금반환', '감가상각', '간주임대료', '세금', '관리비',
]

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_LINE: JournalLine = {
  account_code: '',
  account_name: '',
  debit_amount: '',
  credit_amount: '',
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR')
}

export default function NewJournalEntryPage() {
  const router = useRouter()

  const [entryDate, setEntryDate] = useState(TODAY)
  const [entryType, setEntryType] = useState<JournalEntryType>('일반')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([
    { ...EMPTY_LINE },
    { ...EMPTY_LINE },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    setLines(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addLine() {
    setLines(prev => [...prev, { ...EMPTY_LINE }])
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0)
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!entryDate) { setError('전표일자를 입력해 주세요.'); return }
    if (!description.trim()) { setError('적요를 입력해 주세요.'); return }

    const filledLines = lines.filter(l => l.account_code.trim() || l.debit_amount || l.credit_amount)
    if (filledLines.length < 2) { setError('분개 라인을 최소 2개 입력해 주세요.'); return }

    const debit = filledLines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0)
    const credit = filledLines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0)

    if (Math.abs(debit - credit) >= 0.01) {
      setError(`차변합계(${formatNumber(debit)}원)와 대변합계(${formatNumber(credit)}원)가 일치하지 않습니다. 복식부기는 반드시 대차가 일치해야 합니다.`)
      return
    }
    if (debit === 0) {
      setError('금액을 입력해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: entryDate,
          entry_type: entryType,
          description: description.trim(),
          lines: filledLines.map(l => ({
            account_code: l.account_code.trim(),
            account_name: l.account_name.trim() || l.account_code.trim(),
            debit_amount: parseFloat(l.debit_amount) || 0,
            credit_amount: parseFloat(l.credit_amount) || 0,
          })),
          auto_post: false,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        const msg = json.error?.fieldErrors
          ? Object.values(json.error.fieldErrors as Record<string, string[]>).flat().join(', ')
          : json.error ?? '등록 실패'
        throw new Error(msg)
      }

      router.push('/accounting/journal')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/accounting/journal">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="w-4 h-4" />
            분개장
          </Button>
        </Link>
        <h2 className="text-xl font-semibold text-gray-900">전표 등록</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 기본 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="entry_date">
                  전표일자 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  분개유형 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={entryType}
                  onValueChange={v => setEntryType(v as JournalEntryType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">
                  적요 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="거래 내용을 입력하세요."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 분개 라인 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">분개 내역</CardTitle>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
                <Plus className="w-4 h-4" />
                행 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_120px_120px_36px] gap-2 px-1">
              <span className="text-xs font-medium text-gray-500">계정코드</span>
              <span className="text-xs font-medium text-gray-500">계정과목</span>
              <span className="text-xs font-medium text-gray-500 text-right">차변금액 (원)</span>
              <span className="text-xs font-medium text-gray-500 text-right">대변금액 (원)</span>
              <span />
            </div>

            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_120px_120px_36px] gap-2 items-center">
                <Input
                  value={line.account_code}
                  onChange={e => updateLine(i, 'account_code', e.target.value)}
                  placeholder="예) 1010"
                />
                <Input
                  value={line.account_name}
                  onChange={e => updateLine(i, 'account_name', e.target.value)}
                  placeholder="예) 현금"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={line.debit_amount}
                  onChange={e => updateLine(i, 'debit_amount', e.target.value)}
                  placeholder="0"
                  className="text-right"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={line.credit_amount}
                  onChange={e => updateLine(i, 'credit_amount', e.target.value)}
                  placeholder="0"
                  className="text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-0 h-8 w-8 text-gray-400 hover:text-red-500"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 2}
                  title="행 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {/* 합계 행 */}
            <div className="border-t pt-3 mt-1">
              <div className="grid grid-cols-[1fr_1fr_120px_120px_36px] gap-2 items-center">
                <div className="col-span-2 text-sm font-medium text-gray-700 text-right pr-2">합계</div>
                <div className={`text-right text-sm font-semibold px-3 py-2 rounded ${isBalanced ? 'text-blue-700 bg-blue-50' : 'text-gray-800'}`}>
                  {formatNumber(totalDebit)}
                </div>
                <div className={`text-right text-sm font-semibold px-3 py-2 rounded ${isBalanced ? 'text-blue-700 bg-blue-50' : 'text-gray-800'}`}>
                  {formatNumber(totalCredit)}
                </div>
                <div />
              </div>
              {totalDebit > 0 && !isBalanced && (
                <p className="text-xs text-amber-600 mt-2 text-right pr-9">
                  차이: {formatNumber(Math.abs(totalDebit - totalCredit))}원 — 차변과 대변이 일치해야 합니다.
                </p>
              )}
              {isBalanced && (
                <p className="text-xs text-green-600 mt-2 text-right pr-9">
                  차변과 대변이 일치합니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-md">{error}</p>
        )}

        <div className="flex justify-end gap-2 pb-6">
          <Link href="/accounting/journal">
            <Button type="button" variant="outline">취소</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? '등록 중...' : '전표 등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}
