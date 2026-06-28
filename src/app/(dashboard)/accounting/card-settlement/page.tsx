'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCard, Loader2, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react'
import Link from 'next/link'

const CARD_PAYABLE_CODE = '322' // 미지급금

interface SettlementRow {
  vendor_id: string | null
  vendor_name: string
  outstanding: number
}

interface Account {
  code: string
  name: string
  account_type: string
  account_subtype: string
}

const TODAY = new Date().toISOString().slice(0, 10)

function digits(v: string) { return v.replace(/\D/g, '') }
function commaFmt(v: string) {
  const n = digits(v)
  return n ? Number(n).toLocaleString('ko-KR') : ''
}
function parseAmt(v: string) { return parseInt(digits(v), 10) || 0 }
function fmt(n: number) { return n.toLocaleString('ko-KR') }

export default function CardSettlementPage() {
  const router = useRouter()

  const [rows, setRows]         = useState<SettlementRow[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // 선택된 카드사 정산 폼
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [payDate, setPayDate]         = useState(TODAY)
  const [payAccount, setPayAccount]   = useState('102') // 결제계좌(보통예금)
  const [payAmount, setPayAmount]     = useState('')
  const [submitting, setSubmitting]   = useState(false)

  const loadRows = useCallback(() => {
    setLoading(true)
    fetch('/api/accounting/card-settlement')
      .then(r => r.json())
      .then(json => setRows(json.data ?? []))
      .catch(() => setError('미결제 카드대금을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadRows()
    fetch('/api/accounting/chart-of-accounts')
      .then(r => r.json())
      .then(json => setAccounts((json.data ?? []).filter((a: Account) => a.account_subtype === '유동자산')))
      .catch(() => {})
  }, [loadRows])

  const keyOf = (r: SettlementRow) => r.vendor_id ?? '__none__'

  function startSettle(r: SettlementRow) {
    setSelectedKey(keyOf(r))
    setPayDate(TODAY)
    setPayAccount('102')
    setPayAmount(fmt(r.outstanding))
    setError(null)
  }

  async function submitSettle(r: SettlementRow) {
    const amount = parseAmt(payAmount)
    if (amount <= 0) { setError('결제금액을 입력하세요.'); return }
    if (amount > r.outstanding + 0.001) { setError('결제금액이 미결제 잔액을 초과할 수 없습니다.'); return }
    if (!payAccount) { setError('결제계좌를 선택하세요.'); return }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date:  payDate,
          entry_type:  '카드결제',
          description: `${r.vendor_name} 카드대금 결제`,
          vendor_id:   r.vendor_id || null,
          lines: [
            { account_code: CARD_PAYABLE_CODE, debit_amount: amount, credit_amount: 0 }, // 미지급금 ↓
            { account_code: payAccount,        debit_amount: 0,      credit_amount: amount }, // 보통예금 ↓
          ],
          auto_post: true,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        const msg = json.error?.fieldErrors
          ? Object.values(json.error.fieldErrors as Record<string, string[]>).flat().join(', ')
          : json.error ?? '결제전표 생성 실패'
        throw new Error(msg)
      }
      setSelectedKey(null)
      loadRows()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">카드대금 정산</h1>
          <p className="text-sm text-muted-foreground">
            카드사별 미결제 카드대금(미지급금)을 확인하고 결제전표를 생성합니다.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>미결제 카드대금</CardTitle>
          <span className="text-sm text-muted-foreground">
            합계 <strong className="text-foreground">{fmt(totalOutstanding)}</strong>원
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 불러오는 중…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2 text-green-500" />
              미결제 카드대금이 없습니다.
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map(r => {
                const k = keyOf(r)
                const isOpen = selectedKey === k
                return (
                  <li key={k} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{r.vendor_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="tabular-nums font-semibold">{fmt(r.outstanding)}원</span>
                        <Button
                          size="sm"
                          variant={isOpen ? 'secondary' : 'default'}
                          onClick={() => (isOpen ? setSelectedKey(null) : startSettle(r))}
                        >
                          {isOpen ? '취소' : '결제'}
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md bg-muted/40 p-3">
                        <div className="space-y-1">
                          <Label>결제일자</Label>
                          <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>결제계좌</Label>
                          <Select value={payAccount} onValueChange={setPayAccount}>
                            <SelectTrigger><SelectValue placeholder="계좌 선택" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map(a => (
                                <SelectItem key={a.code} value={a.code}>{a.code} {a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>결제금액</Label>
                          <Input
                            inputMode="numeric"
                            value={payAmount}
                            onChange={e => setPayAmount(commaFmt(e.target.value))}
                          />
                        </div>
                        <div className="sm:col-span-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            차변 미지급금(322) / 대변 {payAccount} — 부분결제 시 금액을 줄이세요.
                          </span>
                          <Button size="sm" disabled={submitting} onClick={() => submitSettle(r)}>
                            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                            결제전표 생성
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        카드 사용 시 <Link href="/accounting/journal/new?entry_type=카드지출" className="underline">카드지출 전표</Link>로
        입력하면(대변 미지급금) 여기서 카드사별로 모아 결제할 수 있습니다.
      </p>
    </div>
  )
}
