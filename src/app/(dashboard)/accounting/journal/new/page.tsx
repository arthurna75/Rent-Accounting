'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, AlertTriangle,
  Copy, Search, Paperclip, X, ImageIcon, FileText, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import type { EvidenceType, JournalEntryType, Vendor } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────
// 타입
// ────────────────────────────────────────
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

interface EntryForCopy {
  id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: string
  lines: {
    debit_amount: number
    credit_amount: number
    account: { code: string; name: string } | null
  }[]
}

// ────────────────────────────────────────
// 상수
// ────────────────────────────────────────
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

// 분개유형별 기본 계정코드 (DB에 해당 코드가 없으면 빈 문자열로 대체)
const DEFAULT_CODES: Record<string, { debit: string; credit: string }> = {
  '비용지출':  { debit: '',    credit: '102' }, // 대변: 보통예금
  '임대수익':  { debit: '102', credit: '510' }, // 차변: 보통예금, 대변: 임대수익
  '보증금수령': { debit: '102', credit: '310' }, // 차변: 보통예금, 대변: 임대보증금
  '보증금반환': { debit: '310', credit: '102' }, // 차변: 임대보증금, 대변: 보통예금
  '일반':      { debit: '',    credit: '' },
}

const TODAY = new Date().toISOString().slice(0, 10)

// ────────────────────────────────────────
// 유틸
// ────────────────────────────────────────
function digits(v: string) { return v.replace(/\D/g, '') }
function commaFmt(v: string) {
  const n = digits(v)
  return n ? Number(n).toLocaleString('ko-KR') : ''
}
function parseAmt(v: string) { return parseInt(digits(v), 10) || 0 }
function fmt(n: number) { return n.toLocaleString('ko-KR') }

async function resizeImage(file: File, maxWidth = 800): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const ratio = img.width > maxWidth ? maxWidth / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', 0.85,
        )
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(url)
}

function makeDefaultLines(type: JournalEntryType, acctMap: Record<string, string>): JournalLine[] {
  const codes = DEFAULT_CODES[type] ?? { debit: '', credit: '' }
  return [
    { side: 'debit',  account_code: codes.debit,  account_name: acctMap[codes.debit]  ?? '', amount: '' },
    { side: 'credit', account_code: codes.credit, account_name: acctMap[codes.credit] ?? '', amount: '' },
  ]
}

// ────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────
function NewJournalEntryPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initContractId = searchParams.get('contract_id') ?? ''
  const initEntryType = searchParams.get('entry_type') as JournalEntryType | null

  const [entryDate, setEntryDate]     = useState(TODAY)
  const [entryType, setEntryType]     = useState<JournalEntryType>(
    initEntryType && ENTRY_TYPES.includes(initEntryType) ? initEntryType : '비용지출'
  )
  const [description, setDescription] = useState('')
  const [vendorId, setVendorId]       = useState<string>('')
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('')
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [contractId, setContractId]   = useState<string>(initContractId)
  const [uploading, setUploading]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [lines, setLines] = useState<JournalLine[]>([
    { side: 'debit',  account_code: '', account_name: '', amount: '' },
    { side: 'credit', account_code: '', account_name: '', amount: '' },
  ])

  const [accounts, setAccounts]   = useState<Account[]>([])
  const [acctMap, setAcctMap]     = useState<Record<string, string>>({})
  const [vendors, setVendors]     = useState<Vendor[]>([])
  const [contracts, setContracts] = useState<ContractOption[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // 전표 복사 다이얼로그
  const [copyOpen, setCopyOpen]   = useState(false)
  const [copyList, setCopyList]   = useState<EntryForCopy[]>([])
  const [copySearch, setCopySearch] = useState('')
  const [copyLoading, setCopyLoading] = useState(false)

  // ── 초기 데이터 로딩 ──
  useEffect(() => {
    fetch('/api/accounting/chart-of-accounts')
      .then(r => r.json())
      .then(json => {
        const list: Account[] = json.data ?? []
        setAccounts(list)
        const map: Record<string, string> = {}
        list.forEach(a => { map[a.code] = a.name })
        setAcctMap(map)
        // 계정 맵 로딩 후 기본 라인 초기화 (initEntryType 반영)
        const resolvedType = initEntryType && ENTRY_TYPES.includes(initEntryType) ? initEntryType : '비용지출'
        setLines(makeDefaultLines(resolvedType, map))
      })
      .catch(() => {})

    fetch('/api/vendors')
      .then(r => r.json())
      .then(json => setVendors(json.data ?? []))
      .catch(() => {})

    // 활성 계약 로딩 (적용호수용)
    void createClient()
      .from('lease_contracts')
      .select('id, property_id, lessee_name, property:properties!property_id(building_name, unit_number)')
      .eq('status', 'active')
      .then(({ data }) => {
        const sorted = ((data ?? []) as ContractOption[]).sort((a, b) => {
          const aKey = `${a.property?.building_name ?? ''} ${a.property?.unit_number ?? ''}`
          const bKey = `${b.property?.building_name ?? ''} ${b.property?.unit_number ?? ''}`
          return aKey.localeCompare(bKey, 'ko', { numeric: true })
        })
        setContracts(sorted)
      })
  }, [])

  // ── 분개유형 변경 → 기본 라인 재설정 ──
  function handleEntryTypeChange(type: JournalEntryType) {
    setEntryType(type)
    setLines(makeDefaultLines(type, acctMap))
  }

  // ── 라인별 허용 계정 (분개유형 + 차/대변 기준 필터) ──
  const allowedAccounts = useMemo(() => {
    const filter = ENTRY_FILTER[entryType] ?? { debit: [], credit: [] }
    return {
      debit:  filter.debit.length  > 0 ? accounts.filter(a => filter.debit.includes(a.account_type))  : accounts,
      credit: filter.credit.length > 0 ? accounts.filter(a => filter.credit.includes(a.account_type)) : accounts,
    }
  }, [accounts, entryType])

  // ── 선택된 계약 ──
  const selectedContract = useMemo(
    () => contracts.find(c => c.id === contractId) ?? null,
    [contracts, contractId],
  )

  // ── 복사 다이얼로그 ──
  async function openCopyDialog() {
    setCopyOpen(true)
    if (copyList.length > 0) return
    setCopyLoading(true)
    try {
      const res = await fetch('/api/accounting/journal-entries?limit=50')
      const json = await res.json()
      setCopyList(json.data ?? [])
    } catch { /* silent */ } finally {
      setCopyLoading(false)
    }
  }

  function applyCopy(entry: EntryForCopy) {
    const newLines: JournalLine[] = entry.lines.map(l => ({
      side: l.debit_amount > 0 ? 'debit' : 'credit',
      account_code: l.account?.code ?? '',
      account_name: l.account?.name ?? '',
      amount: commaFmt(String(l.debit_amount > 0 ? l.debit_amount : l.credit_amount)),
    }))
    if (newLines.length >= 2) setLines(newLines)
    setEntryType(entry.entry_type as JournalEntryType)
    setCopyOpen(false)
    setCopySearch('')
  }

  const filteredEntries = copyList.filter(e =>
    e.description.includes(copySearch) ||
    e.entry_number.includes(copySearch) ||
    e.entry_type.includes(copySearch),
  )

  // ── 라인 조작 ──
  function setLineSide(idx: number, side: 'debit' | 'credit') {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, side, account_code: '', account_name: '' } : l))
  }

  function setLineCode(idx: number, code: string, pool: Account[]) {
    const name = pool.find(a => a.code === code)?.name ?? acctMap[code] ?? ''
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, account_code: code, account_name: name } : l))
  }

  function setLineAmount(idx: number, val: string) {
    setLines(prev => {
      const updated = prev.map((l, i) => i === idx ? { ...l, amount: commaFmt(val) } : l)
      const changedLine = updated[idx]
      if (changedLine.side === 'debit') {
        const creditLines = updated.filter(l => l.side === 'credit')
        if (creditLines.length === 1) {
          const totalDebit = updated.reduce((s, l) => l.side === 'debit' ? s + parseAmt(l.amount) : s, 0)
          const creditIdx  = updated.findIndex(l => l.side === 'credit')
          return updated.map((l, i) =>
            i === creditIdx ? { ...l, amount: totalDebit > 0 ? commaFmt(String(totalDebit)) : '' } : l,
          )
        }
      }
      return updated
    })
  }

  function addLine() { setLines(prev => [...prev, { side: 'debit', account_code: '', account_name: '', amount: '' }]) }
  function removeLine(idx: number) { if (lines.length > 2) setLines(prev => prev.filter((_, i) => i !== idx)) }

  const totalDebit  = lines.reduce((s, l) => l.side === 'debit'  ? s + parseAmt(l.amount) : s, 0)
  const totalCredit = lines.reduce((s, l) => l.side === 'credit' ? s + parseAmt(l.amount) : s, 0)
  const diff       = Math.abs(totalDebit - totalCredit)
  const isBalanced = totalDebit > 0 && diff < 0.01
  const hasAmount  = totalDebit > 0 || totalCredit > 0

  // ── 파일 첨부 ──
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    const newUrls: string[] = []
    try {
      for (const raw of files) {
        const file = await resizeImage(raw, 800)
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '업로드 실패')
        newUrls.push(json.url)
      }
      setAttachmentUrls(prev => [...prev, ...newUrls])
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 업로드 실패')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeAttachment(url: string) {
    try {
      await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    } catch { /* 무시 */ }
    setAttachmentUrls(prev => prev.filter(u => u !== url))
  }

  // ── 제출 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setShowLoginModal(true); return }

    if (!entryDate)          { setError('전표일자를 입력해 주세요.'); return }
    if (!description.trim()) { setError('적요를 입력해 주세요.'); return }

    const filled = lines.filter(l => l.account_code.trim() && digits(l.amount))
    if (filled.length < 2) { setError('계정과목과 금액이 입력된 행이 최소 2개 필요합니다.'); return }

    const d = filled.reduce((s, l) => l.side === 'debit'  ? s + parseAmt(l.amount) : s, 0)
    const c = filled.reduce((s, l) => l.side === 'credit' ? s + parseAmt(l.amount) : s, 0)
    if (Math.abs(d - c) >= 0.01) {
      setError(`대차 불일치: 차변 합계 ${fmt(d)}원 / 대변 합계 ${fmt(c)}원 (차이 ${fmt(Math.abs(d - c))}원)`)
      return
    }
    if (d === 0) { setError('금액을 입력해 주세요.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date:      entryDate,
          entry_type:      entryType,
          description:     description.trim(),
          vendor_id:       vendorId || null,
          evidence_type:   evidenceType || null,
          attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
          lines: filled.map(l => ({
            account_code:  l.account_code.trim(),
            debit_amount:  l.side === 'debit'  ? parseAmt(l.amount) : 0,
            credit_amount: l.side === 'credit' ? parseAmt(l.amount) : 0,
            contract_id:   contractId || undefined,
            property_id:   selectedContract?.property_id || undefined,
          })),
          auto_post: true,
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
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 계약 표시 레이블 ──
  function contractLabel(c: ContractOption) {
    const prop = c.property
    const propName = prop
      ? `${prop.building_name}${prop.unit_number ? ' ' + prop.unit_number : ''}`
      : '(부동산 미연결)'
    return `${propName} · ${c.lessee_name}`
  }

  // ────────────────────────────────────────
  // 렌더
  // ────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        description="전표를 등록하려면 로그인이 필요합니다."
      />

      {/* 전표 복사 다이얼로그 */}
      <Dialog open={copyOpen} onOpenChange={open => { setCopyOpen(open); if (!open) setCopySearch('') }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>전표 복사</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-1">
            기존 전표의 분개 내역을 현재 폼에 복사합니다.
            <span className="text-amber-600 ml-1">일자·적요는 새로 입력하세요.</span>
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="적요, 전표번호, 분개유형 검색..."
              value={copySearch}
              onChange={e => setCopySearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="overflow-y-auto max-h-[52vh] space-y-2 pr-1">
            {copyLoading ? (
              <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
            ) : filteredEntries.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-10">
                {copySearch ? '검색 결과가 없습니다.' : '등록된 전표가 없습니다.'}
              </p>
            ) : filteredEntries.map(entry => (
              <div key={entry.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900 truncate">{entry.description}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{entry.entry_type}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{entry.entry_number} · {entry.entry_date}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {entry.lines.map((l, i) => (
                      <span key={i} className={cn('mr-2', l.debit_amount > 0 ? 'text-blue-600' : 'text-red-500')}>
                        {l.debit_amount > 0 ? '차' : '대'} {l.account?.name}
                      </span>
                    ))}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => applyCopy(entry)}>
                  <Copy className="w-3.5 h-3.5" />
                  복사
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/accounting/journal">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
              분개장
            </Button>
          </Link>
          <h2 className="text-xl font-semibold text-gray-900">전표 등록</h2>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-gray-600" onClick={openCopyDialog}>
          <Copy className="w-3.5 h-3.5" />
          전표 복사
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 기본 정보 ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              {/* 전표일자 */}
              <div className="space-y-1.5">
                <Label htmlFor="entry_date">전표일자 <span className="text-red-500">*</span></Label>
                <Input id="entry_date" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              </div>

              {/* 분개유형 */}
              <div className="space-y-1.5">
                <Label>분개유형 <span className="text-red-500">*</span></Label>
                <Select value={entryType} onValueChange={v => handleEntryTypeChange(v as JournalEntryType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* 적요 */}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">적요 <span className="text-red-500">*</span></Label>
                <Input
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="거래 내용을 입력하세요."
                />
              </div>

              {/* 적용호수 (계약 선택) */}
              <div className="col-span-2 space-y-1.5">
                <Label>적용 호수 (계약)</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="계약 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {contractLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedContract && (
                  <p className="text-xs text-blue-600 pl-1">
                    선택된 계약의 건물·호수가 분개 라인에 자동 연결됩니다.
                  </p>
                )}
              </div>

              {/* 지급처 */}
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

              {/* 증빙 */}
              <div className="space-y-1.5">
                <Label>증빙</Label>
                <Select value={evidenceType} onValueChange={v => setEvidenceType(v as EvidenceType | '')}>
                  <SelectTrigger><SelectValue placeholder="증빙 선택 (선택)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {EVIDENCE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        {t === '영수증' ? '영수증(또는 계좌이체)' : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── 분개 내역 ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">분개 내역</CardTitle>
                {entryType !== '일반' && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entryType} — 차변: {ENTRY_FILTER[entryType]?.debit.join('·') || '전체'},
                    {' '}대변: {ENTRY_FILTER[entryType]?.credit.join('·') || '전체'} 계정만 표시
                  </p>
                )}
              </div>
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
                  {/* 차변/대변 토글 */}
                  <div className="flex h-9 rounded-md border overflow-hidden text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setLineSide(i, 'debit')}
                      className={cn(
                        'flex-1 transition-colors',
                        line.side === 'debit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 hover:text-blue-600',
                      )}
                    >
                      차변
                    </button>
                    <button
                      type="button"
                      onClick={() => setLineSide(i, 'credit')}
                      className={cn(
                        'flex-1 border-l transition-colors',
                        line.side === 'credit' ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500',
                      )}
                    >
                      대변
                    </button>
                  </div>

                  {/* 계정과목 셀렉트 (분개유형별 필터 적용) */}
                  {pool.length > 0 ? (
                    <select
                      value={line.account_code}
                      onChange={e => setLineCode(i, e.target.value, pool)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">계정 선택...</option>
                      {pool.map(a => (
                        <option key={a.code} value={a.code}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <Input
                        value={line.account_code}
                        onChange={e => setLineCode(i, e.target.value, accounts)}
                        placeholder="코드"
                        className="w-20 shrink-0"
                      />
                      <div className="flex-1 h-9 flex items-center px-3 rounded-md border border-input bg-gray-50 text-sm text-gray-500 truncate">
                        {line.account_name || <span className="text-gray-300">계정과목명</span>}
                      </div>
                    </div>
                  )}

                  {/* 금액 */}
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={line.amount}
                    onChange={e => setLineAmount(i, e.target.value)}
                    placeholder="0"
                    className="text-right tabular-nums"
                  />

                  {/* 삭제 */}
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

            {/* 대차 합계 */}
            <div className={cn(
              'mt-3 rounded-lg px-4 py-3 border',
              !hasAmount  ? 'bg-gray-50 border-gray-200'
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

        {/* ── 증빙 첨부 ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">증빙 첨부</CardTitle>
              <div className="flex items-center gap-2">
                {uploading && (
                  <span className="flex items-center gap-1 text-xs text-blue-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    업로드 중...
                  </span>
                )}
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Paperclip className="w-4 h-4" />
                  파일 추가
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp" multiple className="hidden" onChange={handleFileSelect} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {attachmentUrls.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400 cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="w-6 h-6" />
                <p className="text-xs">이미지(가로 800px 자동조정) 또는 문서 첨부</p>
                <p className="text-xs text-gray-300">JPG · PNG · PDF · HWP · DOC · XLS 등</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {attachmentUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    {isImageUrl(url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={`첨부 ${i + 1}`} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-24 gap-1 text-gray-400">
                        <FileText className="w-8 h-8" />
                        <span className="text-xs truncate px-2">{url.split('/').pop()?.split('_').pop()}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => removeAttachment(url)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {isImageUrl(url) && (
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-black/40 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-300 hover:text-blue-400 text-gray-300 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Plus className="w-5 h-5" />
                  <span className="text-xs">추가</span>
                </div>
              </div>
            )}
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
          <Button type="submit" disabled={submitting || !isBalanced || uploading}>
            {submitting ? '등록 중...' : '전표 등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewJournalEntryPage() {
  return (
    <Suspense>
      <NewJournalEntryPageInner />
    </Suspense>
  )
}
