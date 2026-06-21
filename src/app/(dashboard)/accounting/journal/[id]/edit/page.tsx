'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { EvidenceType, JournalEntryType, Vendor } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'
import { cn } from '@/lib/utils'

interface Account {
  code: string
  name: string
  account_type: string
}

interface ContractOption {
  id: string
  property_id: string
  lessee_name: string
  property: { building_name: string; unit_number: string } | null
}

interface JournalLine {
  side: 'debit' | 'credit'
  account_code: string
  account_name: string
  amount: string
}

// 세금·관리비·감가상각·간주임대료 제거, 사용자 지정 순서
const ENTRY_TYPES: JournalEntryType[] = [
  '비용지출', '임대수익', '보증금수령', '보증금반환', '일반',
]

const EVIDENCE_TYPES: EvidenceType[] = ['현금영수증', '세금계산서', '영수증', '사업자용 카드', '기타']

// 분개유형 → 차변/대변 허용 계정유형
const ENTRY_FILTER: Record<string, { debit: string[]; credit: string[] }> = {
  '비용지출':  { debit: ['비용'],  credit: ['자산'] },
  '임대수익':  { debit: ['자산'],  credit: ['수익'] },
  '보증금수령': { debit: ['자산'],  credit: ['부채'] },
  '보증금반환': { debit: ['부채'],  credit: ['자산'] },
  '일반':      { debit: [],       credit: [] },
}

function digits(v: string) { return v.replace(/\D/g, '') }
function commaFmt(v: string) {
  const n = digits(v)
  return n ? Number(n).toLocaleString('ko-KR') : ''
}
function parseAmt(v: string) { return parseInt(digits(v), 10) || 0 }
function fmt(n: number) { return n.toLocaleString('ko-KR') }

export default function EditJournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading]       = useState(true)
  const [entryDate, setEntryDate]   = useState('')
  const [entryType, setEntryType]   = useState<JournalEntryType>('비용지출')
  const [description, setDescription] = useState('')
  const [vendorId, setVendorId]     = useState<string>('')
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('')
  const [contractId, setContractId] = useState<string>('')
  const [lines, setLines]           = useState<JournalLine[]>([])

  const [accounts, setAccounts]   = useState<Account[]>([])
  const [acctMap, setAcctMap]     = useState<Record<string, string>>({})
  const [vendors, setVendors]     = useState<Vendor[]>([])
  const [contracts, setContracts] = useState<ContractOption[]>([])

  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // 분개유형별 허용 계정 필터
  const allowedAccounts = useMemo(() => {
    const filter = ENTRY_FILTER[entryType] ?? { debit: [], credit: [] }
    return {
      debit:  filter.debit.length  > 0 ? accounts.filter(a => filter.debit.includes(a.account_type))  : accounts,
      credit: filter.credit.length > 0 ? accounts.filter(a => filter.credit.includes(a.account_type)) : accounts,
    }
  }, [accounts, entryType])

  const selectedContract = useMemo(
    () => contracts.find(c => c.id === contractId) ?? null,
    [contracts, contractId],
  )

  function contractLabel(c: ContractOption) {
    const prop = c.property
    const propName = prop
      ? `${prop.building_name}${prop.unit_number ? ' ' + prop.unit_number : ''}`
      : '(부동산 미연결)'
    return `${propName} · ${c.lessee_name}`
  }

  useEffect(() => {
    // 활성 계약 로딩
    void createClient()
      .from('lease_contracts')
      .select('id, property_id, lessee_name, property:properties!property_id(building_name, unit_number)')
      .eq('status', 'active')
      .order('property_id')
      .then(({ data }) => setContracts((data ?? []) as ContractOption[]))

    Promise.all([
      fetch(`/api/accounting/journal-entries/${id}`).then(r => r.json()),
      fetch('/api/accounting/chart-of-accounts').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
    ]).then(([entryJson, acctJson, vendorJson]) => {
      // 계정과목 맵 구성
      const list: Account[] = acctJson.data ?? []
      setAccounts(list)
      const map: Record<string, string> = {}
      list.forEach((a: Account) => { map[a.code] = a.name })
      setAcctMap(map)

      setVendors(vendorJson.data ?? [])

      // 전표 데이터 세팅
      const entry = entryJson.data
      if (!entry) { setError('전표를 찾을 수 없습니다.'); setLoading(false); return }
      if (entry.status !== 'draft') { setError('draft 상태의 전표만 수정할 수 있습니다.'); setLoading(false); return }

      setEntryDate(entry.entry_date)
      setEntryType(entry.entry_type)
      setDescription(entry.description)
      setVendorId(entry.vendor_id ?? '')
      setEvidenceType(entry.evidence_type ?? '')

      const entryLines: JournalLine[] = (entry.lines ?? [])
        .sort((a: { line_order: number }, b: { line_order: number }) => a.line_order - b.line_order)
        .map((l: { debit_amount: number; credit_amount: number; account?: { code: string; name: string } | null }) => ({
          side: l.debit_amount > 0 ? 'debit' : 'credit',
          account_code: l.account?.code ?? '',
          account_name: l.account?.name ?? '',
          amount: commaFmt(String(l.debit_amount > 0 ? l.debit_amount : l.credit_amount)),
        }))

      setLines(entryLines.length >= 2 ? entryLines : [
        { side: 'debit', account_code: '', account_name: '', amount: '' },
        { side: 'credit', account_code: '', account_name: '', amount: '' },
      ])
      setLoading(false)
    }).catch(() => {
      setError('데이터를 불러오는 데 실패했습니다.')
      setLoading(false)
    })
  }, [id])

  function setLineSide(idx: number, side: 'debit' | 'credit') {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, side, account_code: '', account_name: '' } : l))
  }

  function setLineCode(idx: number, code: string, pool: Account[]) {
    const name = pool.find(a => a.code === code)?.name ?? acctMap[code] ?? ''
    setLines(prev => prev.map((l, i) =>
      i === idx ? { ...l, account_code: code, account_name: name } : l,
    ))
  }

  function setLineAmount(idx: number, val: string) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, amount: commaFmt(val) } : l))
  }

  function addLine() {
    setLines(prev => [...prev, { side: 'debit', account_code: '', account_name: '', amount: '' }])
  }

  function removeLine(idx: number) {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  const totalDebit  = lines.reduce((s, l) => l.side === 'debit'  ? s + parseAmt(l.amount) : s, 0)
  const totalCredit = lines.reduce((s, l) => l.side === 'credit' ? s + parseAmt(l.amount) : s, 0)
  const diff = Math.abs(totalDebit - totalCredit)
  const isBalanced = totalDebit > 0 && diff < 0.01
  const hasAmount = totalDebit > 0 || totalCredit > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setShowLoginModal(true); return }

    if (!entryDate)           { setError('전표일자를 입력해 주세요.'); return }
    if (!description.trim())  { setError('적요를 입력해 주세요.'); return }

    const filled = lines.filter(l => l.account_code.trim() && digits(l.amount))
    if (filled.length < 2) { setError('계정과목과 금액이 입력된 행이 최소 2개 필요합니다.'); return }

    const d = filled.reduce((s, l) => l.side === 'debit'  ? s + parseAmt(l.amount) : s, 0)
    const c = filled.reduce((s, l) => l.side === 'credit' ? s + parseAmt(l.amount) : s, 0)
    if (Math.abs(d - c) >= 0.01) {
      setError(`대차 불일치: 차변 합계 ${fmt(d)}원 / 대변 합계 ${fmt(c)}원 (차이 ${fmt(Math.abs(d - c))}원).`)
      return
    }
    if (d === 0) { setError('금액을 입력해 주세요.'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/accounting/journal-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          entry_date: entryDate,
          entry_type: entryType,
          description: description.trim(),
          vendor_id: vendorId || null,
          evidence_type: evidenceType || null,
          lines: filled.map(l => ({
            account_code:  l.account_code.trim(),
            debit_amount:  l.side === 'debit'  ? parseAmt(l.amount) : 0,
            credit_amount: l.side === 'credit' ? parseAmt(l.amount) : 0,
            contract_id:   contractId || undefined,
            property_id:   selectedContract?.property_id || undefined,
          })),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        const msg = json.error?.fieldErrors
          ? Object.values(json.error.fieldErrors as Record<string, string[]>).flat().join(', ')
          : json.error ?? '수정 실패'
        throw new Error(msg)
      }
      router.push('/accounting/journal')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">불러오는 중...</div>
  }

  if (error && lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/accounting/journal">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="w-4 h-4" />분개장
          </Button>
        </Link>
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        description="전표를 수정하려면 로그인이 필요합니다."
      />

      <div className="flex items-center gap-3">
        <Link href="/accounting/journal">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="w-4 h-4" />
            분개장
          </Button>
        </Link>
        <h2 className="text-xl font-semibold text-gray-900">전표 수정</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="entry_date">전표일자 <span className="text-red-500">*</span></Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>분개유형 <span className="text-red-500">*</span></Label>
                <Select value={entryType} onValueChange={v => setEntryType(v as JournalEntryType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">적요 <span className="text-red-500">*</span></Label>
                <Input
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="거래 내용을 입력하세요."
                />
              </div>
              {/* 적용호수 */}
              <div className="col-span-2 space-y-1.5">
                <Label>적용 호수 (계약)</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="계약 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{contractLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>지급처</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger><SelectValue placeholder="거래처 선택 (선택)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}{v.business_number ? ` (${v.business_number})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>증빙</Label>
                <Select value={evidenceType} onValueChange={v => setEvidenceType(v as EvidenceType | '')}>
                  <SelectTrigger><SelectValue placeholder="증빙 선택 (선택)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {EVIDENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

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
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[88px_1fr_140px_32px] gap-2 px-1 pb-1 border-b">
              <span className="text-xs font-medium text-gray-500">구분</span>
              <span className="text-xs font-medium text-gray-500">계정과목</span>
              <span className="text-xs font-medium text-gray-500 text-right">금액 (원)</span>
              <span />
            </div>

            {lines.map((line, i) => {
              const pool = line.side === 'debit' ? allowedAccounts.debit : allowedAccounts.credit
              return (
              <div key={i} className="grid grid-cols-[88px_1fr_140px_32px] gap-2 items-center">
                <div className="flex h-9 rounded-md border overflow-hidden text-xs font-semibold">
                  <button type="button" onClick={() => setLineSide(i, 'debit')}
                    className={cn('flex-1 transition-colors', line.side === 'debit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 hover:text-blue-600')}>
                    차변
                  </button>
                  <button type="button" onClick={() => setLineSide(i, 'credit')}
                    className={cn('flex-1 border-l transition-colors', line.side === 'credit' ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500')}>
                    대변
                  </button>
                </div>

                {pool.length > 0 ? (
                  <select
                    value={line.account_code}
                    onChange={e => setLineCode(i, e.target.value, pool)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">계정 선택...</option>
                    {pool.map(a => (
                      <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input value={line.account_code} onChange={e => setLineCode(i, e.target.value, accounts)} placeholder="코드" />
                )}

                <Input
                  type="text"
                  inputMode="numeric"
                  value={line.amount}
                  onChange={e => setLineAmount(i, e.target.value)}
                  placeholder="0"
                  className="text-right tabular-nums"
                />

                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 2}
                  className="h-8 w-8 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              )
            })}

            <div className={cn(
              'mt-3 rounded-lg px-4 py-3 border',
              !hasAmount ? 'bg-gray-50 border-gray-200'
                : isBalanced ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200',
            )}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-5 text-sm">
                  <div>
                    <span className="text-gray-500">차변 합계</span>
                    <span className="ml-2 font-semibold text-blue-700 tabular-nums">{fmt(totalDebit)}원</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div>
                    <span className="text-gray-500">대변 합계</span>
                    <span className="ml-2 font-semibold text-red-600 tabular-nums">{fmt(totalCredit)}원</span>
                  </div>
                </div>
                {isBalanced && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <CheckCircle2 className="w-4 h-4" />대차 일치
                  </div>
                )}
                {hasAmount && !isBalanced && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                    <AlertTriangle className="w-4 h-4" />차이 {fmt(diff)}원
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pb-6">
          <Link href="/accounting/journal">
            <Button type="button" variant="outline">취소</Button>
          </Link>
          <Button type="submit" disabled={submitting || !isBalanced}>
            {submitting ? '수정 중...' : '전표 수정'}
          </Button>
        </div>
      </form>
    </div>
  )
}
