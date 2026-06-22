'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle2, Building2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────
// 타입
// ────────────────────────────────────────
interface PropRow {
  id?: string
  building_name: string
  unit_number: string
  land_value: number | null
  building_value: number | null
  land_share_ratio: number | null
  building_area: number | null
  acquisition_date: string
  is_active: boolean
}

interface ContractRow {
  id: string
  property_id: string
  lessee_name: string
  deposit_amount: number
  monthly_rent: number
  monthly_management_fee: number | null
  start_date: string
  end_date: string
}

interface AccountRow {
  id: string
  code: string
  name: string
  account_type: string
  normal_balance: string
}

interface RoomRow {
  _key: string          // 로컬 유니크 키
  propertyId?: string   // 기존 property.id
  contractId?: string   // 기존 contract.id
  unitNumber: string
  exclusiveArea: string
  landShareRatio: string  // % 단위 (예: "4.17")
  landValue: string
  buildingValue: string
  acquisitionDate: string
  tenantName: string
  depositAmount: string
  monthlyRent: string
  managementFee: string
  leaseStart: string
  leaseEnd: string
}

interface WizardClientProps {
  existingProperties: PropRow[]
  existingContracts: ContractRow[]
  accounts: AccountRow[]
}

// ────────────────────────────────────────
// 유틸
// ────────────────────────────────────────
let _keySeq = 0
function newKey() { return String(++_keySeq) }

function digits(v: string) { return v.replace(/[^0-9]/g, '') }
function commaFmt(v: string) {
  const n = parseInt(digits(v), 10)
  return isNaN(n) ? '' : n.toLocaleString('ko-KR')
}
function parseNum(v: string) { return parseInt(digits(v), 10) || 0 }
function parseFloat2(v: string) { return parseFloat(v.replace(/,/g, '')) || 0 }
function fmt(n: number) { return n.toLocaleString('ko-KR') }

const TODAY = new Date().toISOString().slice(0, 10)

function emptyRow(): RoomRow {
  return {
    _key: newKey(),
    unitNumber: '', exclusiveArea: '', landShareRatio: '',
    landValue: '', buildingValue: '', acquisitionDate: TODAY,
    tenantName: '', depositAmount: '', monthlyRent: '', managementFee: '',
    leaseStart: '', leaseEnd: '',
  }
}

function propToRow(p: PropRow, c?: ContractRow): RoomRow {
  return {
    _key: newKey(),
    propertyId:     p.id,
    contractId:     c?.id,
    unitNumber:     p.unit_number,
    exclusiveArea:  p.building_area != null ? String(p.building_area) : '',
    landShareRatio: p.land_share_ratio != null ? String(Math.round(p.land_share_ratio * 1000000) / 10000) : '',
    landValue:      p.land_value != null ? commaFmt(String(p.land_value)) : '',
    buildingValue:  p.building_value != null ? commaFmt(String(p.building_value)) : '',
    acquisitionDate: p.acquisition_date ?? TODAY,
    tenantName:     c?.lessee_name ?? '',
    depositAmount:  c ? commaFmt(String(c.deposit_amount)) : '',
    monthlyRent:    c ? commaFmt(String(c.monthly_rent)) : '',
    managementFee:  c?.monthly_management_fee != null ? commaFmt(String(c.monthly_management_fee)) : '',
    leaseStart:     c?.start_date ?? '',
    leaseEnd:       c?.end_date ?? '',
  }
}

// ────────────────────────────────────────
// 미리보기 라인
// ────────────────────────────────────────
interface PreviewLine {
  side: '차변' | '대변'
  accountName: string
  unitNumber?: string
  amount: number
}

// ────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────
export function WizardClient({ existingProperties, existingContracts, accounts }: WizardClientProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 상태
  const [buildingName, setBuildingName] = useState('')
  const [conversionDate, setConversionDate] = useState(TODAY)
  const [rows, setRows] = useState<RoomRow[]>([emptyRow()])

  // Step 2 상태 (계정과목 선택 + 대출금)
  const [landAccId, setLandAccId]         = useState('')
  const [buildingAccId, setBuildingAccId] = useState('')
  const [depositAccId, setDepositAccId]   = useState('')
  const [loanAccId, setLoanAccId]         = useState('')
  const [capitalAccId, setCapitalAccId]   = useState('')
  const [loanAmount, setLoanAmount]       = useState('')

  // Step 3 상태
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [savedId, setSavedId]   = useState<string | null>(null)

  // 기존 건물 목록 (중복 제거)
  const existingBuildings = useMemo(() =>
    [...new Set(existingProperties.map(p => p.building_name))].sort(),
    [existingProperties],
  )

  // 기존 건물 선택 시 해당 호실 로드
  function loadBuilding(bldName: string) {
    setBuildingName(bldName)
    const props = existingProperties.filter(p => p.building_name === bldName)
    if (props.length === 0) return
    const loaded = props.map(p => {
      const c = existingContracts.find(c => c.property_id === p.id)
      return propToRow(p, c)
    })
    setRows(loaded)
  }

  // ── 행 조작 ──
  const updateRow = useCallback((key: string, field: keyof RoomRow, value: string) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r))
  }, [])

  const addRow = useCallback(() => setRows(prev => [...prev, emptyRow()]), [])
  const deleteRow = useCallback((key: string) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r._key !== key) : prev)
  }, [])

  // ── 합계 계산 ──
  const totalLand     = useMemo(() => rows.reduce((s, r) => s + parseNum(r.landValue),     0), [rows])
  const totalBuilding = useMemo(() => rows.reduce((s, r) => s + parseNum(r.buildingValue), 0), [rows])
  const totalDeposit  = useMemo(() => rows.reduce((s, r) => s + parseNum(r.depositAmount), 0), [rows])
  const totalRent     = useMemo(() => rows.reduce((s, r) => s + parseNum(r.monthlyRent),   0), [rows])
  const totalAsset    = totalLand + totalBuilding
  const loan          = parseNum(loanAmount)
  const capital       = totalAsset - totalDeposit - loan

  // ── 계정 찾기 헬퍼 ──
  function findAcc(id: string) { return accounts.find(a => a.id === id) }
  function accName(id: string) { return findAcc(id)?.name ?? '(계정 미선택)' }

  // ── 분개 미리보기 라인 생성 ──
  const previewLines = useMemo((): PreviewLine[] => {
    const lines: PreviewLine[] = []
    // 차변: 호실별 토지
    rows.forEach(r => {
      const v = parseNum(r.landValue)
      if (v > 0) lines.push({ side: '차변', accountName: accName(landAccId), unitNumber: r.unitNumber, amount: v })
    })
    // 차변: 호실별 건물
    rows.forEach(r => {
      const v = parseNum(r.buildingValue)
      if (v > 0) lines.push({ side: '차변', accountName: accName(buildingAccId), unitNumber: r.unitNumber, amount: v })
    })
    // 대변: 호실별 임대보증금 (임차인 있는 경우)
    rows.forEach(r => {
      const v = parseNum(r.depositAmount)
      if (v > 0 && r.tenantName.trim()) lines.push({ side: '대변', accountName: accName(depositAccId), unitNumber: r.unitNumber, amount: v })
    })
    // 대변: 대출금
    if (loan > 0) lines.push({ side: '대변', accountName: accName(loanAccId), amount: loan })
    // 대변: 자본금
    if (capital > 0) lines.push({ side: '대변', accountName: accName(capitalAccId), amount: capital })
    return lines
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, landAccId, buildingAccId, depositAccId, loanAccId, capitalAccId, loan, capital])

  const previewDebit  = previewLines.filter(l => l.side === '차변').reduce((s, l) => s + l.amount, 0)
  const previewCredit = previewLines.filter(l => l.side === '대변').reduce((s, l) => s + l.amount, 0)
  const isBalanced    = previewDebit > 0 && Math.abs(previewDebit - previewCredit) < 1

  // ── 유효성 검사 ──
  function validateStep1() {
    if (!buildingName.trim()) return '건물명을 입력해 주세요.'
    if (!conversionDate)      return '전환기준일을 입력해 주세요.'
    const valid = rows.filter(r => r.unitNumber.trim() && (parseNum(r.landValue) > 0 || parseNum(r.buildingValue) > 0))
    if (valid.length === 0)   return '최소 1개 호실의 호실번호와 취득가를 입력해 주세요.'
    return null
  }

  function validateStep2() {
    if (!landAccId)    return '토지 계정과목을 선택해 주세요.'
    if (!buildingAccId) return '건물 계정과목을 선택해 주세요.'
    if (totalDeposit > 0 && !depositAccId) return '임대보증금 계정과목을 선택해 주세요.'
    if (loan > 0 && !loanAccId)            return '대출금 계정과목을 선택해 주세요.'
    if (!capitalAccId) return '자본 계정과목을 선택해 주세요.'
    if (capital < 0)   return `자본금이 음수입니다 (${fmt(capital)}원). 대출금 또는 자산 금액을 확인해 주세요.`
    return null
  }

  function goNext() {
    if (step === 1) {
      const e = validateStep1()
      if (e) { setError(e); return }
      setError(null)
      // 초기 계정 자동 추천
      if (!landAccId)     setLandAccId(accounts.find(a => a.name.includes('토지'))?.id ?? '')
      if (!buildingAccId) setBuildingAccId(accounts.find(a => a.name === '건물' || a.name.includes('건물') )?.id ?? '')
      if (!depositAccId)  setDepositAccId(accounts.find(a => a.name.includes('임대보증금'))?.id ?? '')
      if (!loanAccId)     setLoanAccId(accounts.find(a => a.name.includes('차입금'))?.id ?? '')
      if (!capitalAccId)  setCapitalAccId(accounts.find(a => a.name === '자본금' || a.name.includes('자본금'))?.id ?? '')
      setStep(2)
    } else if (step === 2) {
      const e = validateStep2()
      if (e) { setError(e); return }
      setError(null)
      setStep(3)
    }
  }

  // ── 저장 ──
  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const validRows = rows.filter(r => r.unitNumber.trim() && (parseNum(r.landValue) > 0 || parseNum(r.buildingValue) > 0))
      const res = await fetch('/api/accounting/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingName:    buildingName.trim(),
          conversionDate,
          rooms: validRows.map(r => ({
            propertyId:     r.propertyId,
            contractId:     r.contractId,
            unitNumber:     r.unitNumber.trim(),
            exclusiveArea:  parseFloat2(r.exclusiveArea) || null,
            landShareRatio: parseFloat2(r.landShareRatio) / 100 || null,
            landValue:      parseNum(r.landValue),
            buildingValue:  parseNum(r.buildingValue),
            acquisitionDate: r.acquisitionDate || conversionDate,
            tenantName:     r.tenantName.trim() || null,
            depositAmount:  parseNum(r.depositAmount),
            monthlyRent:    parseNum(r.monthlyRent),
            managementFee:  parseNum(r.managementFee) || null,
            leaseStart:     r.leaseStart || null,
            leaseEnd:       r.leaseEnd || null,
          })),
          accounts: {
            land_id:     landAccId,
            building_id: buildingAccId,
            deposit_id:  depositAccId || null,
            loan_id:     loanAccId || null,
            capital_id:  capitalAccId,
          },
          loanAmount: loan,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장에 실패했습니다.')
      setSavedId(json.journalEntryId)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ── 계정 선택 옵션 ──
  function accOptions(types: string[]) {
    return accounts.filter(a => types.includes(a.account_type))
  }

  // ────────────────────────────────────────
  // 저장 완료 화면
  // ────────────────────────────────────────
  if (savedId) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">개시분개 생성 완료</h3>
          <p className="text-sm text-gray-500">
            호실별 자산·임대계약이 등록되고 개시분개가 확정 저장되었습니다.
          </p>
          <div className="flex gap-2 mt-2">
            <Button asChild variant="outline">
              <Link href="/properties">부동산 목록 보기</Link>
            </Button>
            <Button asChild>
              <Link href={`/accounting/journal/${savedId}`}>
                <ExternalLink className="w-4 h-4 mr-1" />
                전표 확인
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ────────────────────────────────────────
  // 스텝 인디케이터
  // ────────────────────────────────────────
  const STEPS = ['호실 입력', '합계 · 계정 설정', '미리보기 · 저장']

  return (
    <div className="space-y-5">
      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3
          const active  = step === n
          const done    = step > n
          return (
            <div key={n} className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                done   ? 'bg-blue-600 text-white'
                  : active ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400'
                  : 'bg-gray-100 text-gray-400',
              )}>
                {done ? '✓' : n}
              </div>
              <span className={cn('text-sm', active ? 'font-semibold text-blue-700' : 'text-gray-500')}>
                {label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
            </div>
          )
        })}
      </div>

      {/* ═══ STEP 1: 호실 입력 ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">건물 기본 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 기존 건물 불러오기 */}
                {existingBuildings.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>기존 건물 불러오기</Label>
                    <Select onValueChange={loadBuilding}>
                      <SelectTrigger><SelectValue placeholder="건물 선택..." /></SelectTrigger>
                      <SelectContent>
                        {existingBuildings.map(b => (
                          <SelectItem key={b} value={b}>
                            <Building2 className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="bldName">건물명 <span className="text-red-500">*</span></Label>
                  <Input
                    id="bldName"
                    value={buildingName}
                    onChange={e => setBuildingName(e.target.value)}
                    placeholder="예: 한강빌라"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="convDate">전환기준일 <span className="text-red-500">*</span></Label>
                  <Input
                    id="convDate"
                    type="date"
                    value={conversionDate}
                    onChange={e => setConversionDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 호실 입력 테이블 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">호실별 자산 · 임대현황</CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">임차인명을 비워두면 공실로 처리됩니다.</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
                  <Plus className="w-4 h-4" />
                  호실 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[1100px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left font-medium text-gray-600 w-20">호실</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 w-20">전용면적(㎡)</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 w-20">토지지분율(%)</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 w-28 text-blue-700">토지취득가(원)</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 w-28 text-blue-700">건물취득가(원)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-28">취득일자</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-20 border-l border-gray-200">임차인명</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 w-28 text-green-700">보증금(원)</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 w-24 text-green-700">월세(원)</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 w-24">관리비(원)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-24">계약시작</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-24">계약종료</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row) => (
                      <tr key={row._key} className="hover:bg-blue-50/30 transition-colors">
                        {/* 호실 */}
                        <td className="sticky left-0 bg-white px-2 py-1 z-10">
                          <Input
                            className="h-7 text-xs font-medium"
                            value={row.unitNumber}
                            onChange={e => updateRow(row._key, 'unitNumber', e.target.value)}
                            placeholder="101호"
                          />
                        </td>
                        {/* 전용면적 */}
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs text-right" value={row.exclusiveArea}
                            onChange={e => updateRow(row._key, 'exclusiveArea', e.target.value)} placeholder="0.00" />
                        </td>
                        {/* 토지지분율 */}
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs text-right" value={row.landShareRatio}
                            onChange={e => updateRow(row._key, 'landShareRatio', e.target.value)} placeholder="4.17" />
                        </td>
                        {/* 토지취득가 */}
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs text-right tabular-nums"
                            value={commaFmt(row.landValue)}
                            onChange={e => updateRow(row._key, 'landValue', digits(e.target.value))} placeholder="0" />
                        </td>
                        {/* 건물취득가 */}
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs text-right tabular-nums"
                            value={commaFmt(row.buildingValue)}
                            onChange={e => updateRow(row._key, 'buildingValue', digits(e.target.value))} placeholder="0" />
                        </td>
                        {/* 취득일자 */}
                        <td className="px-2 py-1">
                          <Input type="date" className="h-7 text-xs"
                            value={row.acquisitionDate}
                            onChange={e => updateRow(row._key, 'acquisitionDate', e.target.value)} />
                        </td>
                        {/* 임차인명 */}
                        <td className="px-2 py-1 border-l border-gray-200">
                          <Input className="h-7 text-xs" value={row.tenantName}
                            onChange={e => updateRow(row._key, 'tenantName', e.target.value)} placeholder="공실" />
                        </td>
                        {/* 보증금 */}
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs text-right tabular-nums"
                            value={commaFmt(row.depositAmount)}
                            onChange={e => updateRow(row._key, 'depositAmount', digits(e.target.value))} placeholder="0" />
                        </td>
                        {/* 월세 */}
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs text-right tabular-nums"
                            value={commaFmt(row.monthlyRent)}
                            onChange={e => updateRow(row._key, 'monthlyRent', digits(e.target.value))} placeholder="0" />
                        </td>
                        {/* 관리비 */}
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs text-right tabular-nums"
                            value={commaFmt(row.managementFee)}
                            onChange={e => updateRow(row._key, 'managementFee', digits(e.target.value))} placeholder="0" />
                        </td>
                        {/* 계약시작 */}
                        <td className="px-2 py-1">
                          <Input type="date" className="h-7 text-xs"
                            value={row.leaseStart}
                            onChange={e => updateRow(row._key, 'leaseStart', e.target.value)} />
                        </td>
                        {/* 계약종료 */}
                        <td className="px-2 py-1">
                          <Input type="date" className="h-7 text-xs"
                            value={row.leaseEnd}
                            onChange={e => updateRow(row._key, 'leaseEnd', e.target.value)} />
                        </td>
                        <td className="px-1 py-1">
                          <button
                            type="button"
                            onClick={() => deleteRow(row._key)}
                            disabled={rows.length <= 1}
                            className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* 합계 행 */}
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                      <td className="sticky left-0 bg-gray-50 px-3 py-2 text-xs text-gray-500 z-10">합계</td>
                      <td /><td />
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-blue-700">{fmt(totalLand)}</td>
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-blue-700">{fmt(totalBuilding)}</td>
                      <td /><td className="border-l border-gray-200" />
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-green-700">{fmt(totalDeposit)}</td>
                      <td className="px-2 py-2 text-right text-xs tabular-nums text-green-700">{fmt(totalRent)}</td>
                      <td /><td /><td /><td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ STEP 2: 합계 확인 + 계정 설정 ═══ */}
      {step === 2 && (
        <div className="space-y-5">
          {/* 합계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '토지 총액',      value: totalLand,     color: 'text-blue-700',  bg: 'bg-blue-50' },
              { label: '건물 총액',      value: totalBuilding, color: 'text-indigo-700', bg: 'bg-indigo-50' },
              { label: '임대보증금 총액', value: totalDeposit,  color: 'text-green-700',  bg: 'bg-green-50' },
              { label: '월세 합계(월)',   value: totalRent,     color: 'text-orange-700', bg: 'bg-orange-50' },
            ].map(c => (
              <Card key={c.label} className={cn('border-0', c.bg)}>
                <CardContent className="py-4 px-5">
                  <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                  <p className={cn('text-lg font-bold tabular-nums', c.color)}>{fmt(c.value)}원</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 균형 방정식 */}
          <Card>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-gray-500 mb-2 font-medium">개시 재무상태 균형 확인</p>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="font-semibold text-blue-700">(토지 + 건물) {fmt(totalAsset)}원</span>
                <span className="text-gray-400">=</span>
                <span className="text-green-700">보증금 {fmt(totalDeposit)}원</span>
                <span className="text-gray-400">+</span>
                <span className="text-orange-700">대출금 {fmt(loan)}원</span>
                <span className="text-gray-400">+</span>
                <span className={cn('font-semibold', capital >= 0 ? 'text-purple-700' : 'text-red-600')}>
                  자본금 {fmt(capital)}원
                </span>
              </div>
              {capital < 0 && (
                <p className="text-xs text-red-600 mt-2">⚠ 자본금이 음수입니다. 대출금을 줄이거나 자산 금액을 확인해 주세요.</p>
              )}
            </CardContent>
          </Card>

          {/* 계정과목 선택 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">계정과목 매핑</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AccSelect label="토지 (차변)" value={landAccId} onChange={setLandAccId}     accounts={accOptions(['자산'])} required />
                <AccSelect label="건물 (차변)" value={buildingAccId} onChange={setBuildingAccId} accounts={accOptions(['자산'])} required />
                <AccSelect label="임대보증금 (대변)" value={depositAccId} onChange={setDepositAccId} accounts={accOptions(['부채'])} />
                <div className="space-y-1.5">
                  <Label>대출금 금액 (원)</Label>
                  <Input
                    type="text" inputMode="numeric"
                    value={commaFmt(loanAmount)}
                    onChange={e => setLoanAmount(digits(e.target.value))}
                    placeholder="0"
                    className="text-right tabular-nums"
                  />
                </div>
                <AccSelect label="대출금 계정 (대변)" value={loanAccId} onChange={setLoanAccId} accounts={accOptions(['부채'])} />
                <AccSelect label="자본금·이익잉여금 (대변)" value={capitalAccId} onChange={setCapitalAccId} accounts={accOptions(['자본'])} required />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ STEP 3: 미리보기 ═══ */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">개시분개 미리보기</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                기준일: {conversionDate} · 총 {previewLines.length}행
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 w-16">구분</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">계정과목</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 w-20">호실</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600 w-36">금액 (원)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewLines.map((line, i) => (
                    <tr key={i} className={line.side === '차변' ? 'bg-blue-50/30' : 'bg-red-50/20'}>
                      <td className="px-4 py-2">
                        <span className={cn(
                          'text-xs font-bold px-1.5 py-0.5 rounded',
                          line.side === '차변' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600',
                        )}>
                          {line.side}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-800">{line.accountName}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{line.unitNumber ?? ''}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td className="px-4 py-2 text-xs font-bold text-gray-600" colSpan={3}>합계</td>
                    <td className="px-4 py-2 text-right">
                      <span className={cn('text-sm font-bold tabular-nums', isBalanced ? 'text-green-700' : 'text-red-600')}>
                        차변 {fmt(previewDebit)} / 대변 {fmt(previewCredit)}
                        {isBalanced ? ' ✓ 균형' : ' ✗ 불균형'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {!isBalanced && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-md">
                차변과 대변이 일치하지 않습니다. 이전 단계로 돌아가 금액을 확인해 주세요.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-md">{error}</p>
      )}

      {/* 네비게이션 버튼 */}
      <div className="flex justify-between pb-6">
        <Button variant="outline" size="sm" disabled={step === 1} onClick={() => { setStep(s => (s - 1) as 1 | 2 | 3); setError(null) }}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          이전
        </Button>
        {step < 3 ? (
          <Button size="sm" onClick={goNext}>
            다음
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button size="sm" disabled={saving || !isBalanced} onClick={handleSave}>
            {saving ? '저장 중...' : '개시분개 생성 및 저장'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// 계정 셀렉트 서브컴포넌트
// ────────────────────────────────────────
function AccSelect({
  label, value, onChange, accounts, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  accounts: AccountRow[]
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="계정 선택..." />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="">없음</SelectItem>}
          {accounts.map(a => (
            <SelectItem key={a.id} value={a.id}>
              {a.code} — {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
