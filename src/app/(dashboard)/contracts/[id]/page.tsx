import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatKRW, formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import ContractTerminateButton from './TerminateButton'

interface PageProps {
  params: Promise<{ id: string }>
}

type ContractStatus = 'active' | 'expired' | 'terminated'
type ContractType = '월세' | '전세' | '반전세'
type DepositTxType = '수령' | '반환' | '증액' | '감액'
type RentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'

interface DepositTransaction {
  id: string
  transaction_date: string
  transaction_type: DepositTxType
  amount: number
  notes: string | null
}

interface RentTransaction {
  id: string
  billing_year: number
  billing_month: number
  amount: number
  vat_amount: number
  paid_amount: number
  status: RentStatus
}

interface Property {
  name: string
  address_road: string | null
  property_type: string | null
}

interface LeaseContract {
  id: string
  lessee_name: string
  lessee_phone: string | null
  lessee_email: string | null
  contract_type: ContractType
  deposit_amount: number
  monthly_rent: number
  vat_included: boolean
  start_date: string
  end_date: string
  status: ContractStatus
  notes: string | null
  property: Property | null
}

function statusBadge(status: ContractStatus) {
  const map: Record<ContractStatus, { label: string; className: string }> = {
    active:     { label: '활성', className: 'bg-green-100 text-green-700 border-green-200' },
    expired:    { label: '만료', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    terminated: { label: '해지', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = map[status]
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>
}

function rentStatusBadge(status: RentStatus) {
  const map: Record<RentStatus, { label: string; className: string }> = {
    unpaid:  { label: '미납', className: 'bg-red-100 text-red-700 border-red-200' },
    partial: { label: '부분납', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    paid:    { label: '납부', className: 'bg-green-100 text-green-700 border-green-200' },
    overdue: { label: '연체', className: 'bg-red-200 text-red-800 border-red-300' },
  }
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' }
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{children}</span>
    </div>
  )
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [contractResult, depositsResult, rentsResult] = await Promise.all([
    supabase
      .from('lease_contracts')
      .select('*, property:properties!property_id(name, address_road, property_type)')
      .eq('id', id)
      .single(),
    supabase
      .from('deposit_transactions')
      .select('*')
      .eq('contract_id', id)
      .order('transaction_date', { ascending: false }),
    supabase
      .from('rent_transactions')
      .select('*')
      .eq('contract_id', id)
      .order('billing_year', { ascending: false })
      .order('billing_month', { ascending: false }),
  ])

  if (contractResult.error || !contractResult.data) notFound()

  const contract = contractResult.data as unknown as LeaseContract
  const deposits = (depositsResult.data ?? []) as unknown as DepositTransaction[]
  const rents = (rentsResult.data ?? []) as unknown as RentTransaction[]

  const days = daysUntil(contract.end_date)
  const dDayLabel = days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`
  const dDayCls =
    days <= 30 ? 'text-red-600 font-semibold' :
    days <= 90 ? 'text-orange-500 font-semibold' :
    'text-gray-500'

  const isActive = contract.status === 'active'

  return (
    <div className="space-y-5 max-w-4xl">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="w-4 h-4" />
            목록
          </Button>
        </Link>
        <div className="flex-1 flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">{contract.lessee_name}</h2>
          {statusBadge(contract.status)}
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Link href={`/contracts/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                수정
              </Button>
            </Link>
          )}
          {isActive && <ContractTerminateButton contractId={id} />}
        </div>
      </div>

      {/* 계약 정보 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">계약 정보</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <InfoRow label="부동산">{contract.property?.name ?? '—'}</InfoRow>
            <InfoRow label="주소">{contract.property?.address_road ?? '—'}</InfoRow>
            <InfoRow label="계약유형">{contract.contract_type}</InfoRow>
            <InfoRow label="보증금">{formatKRW(contract.deposit_amount)}</InfoRow>
            {contract.contract_type !== '전세' && (
              <InfoRow label="월세">{formatKRW(contract.monthly_rent)}</InfoRow>
            )}
            <InfoRow label="부가세 포함">{contract.vat_included ? '포함' : '미포함'}</InfoRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">기간 및 임차인</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <InfoRow label="계약 시작">
              {formatDate(contract.start_date)}
            </InfoRow>
            <InfoRow label="계약 종료">
              {formatDate(contract.end_date)}
            </InfoRow>
            <InfoRow label="잔여일">
              <span className={dDayCls}>{dDayLabel}</span>
            </InfoRow>
            <InfoRow label="연락처">{contract.lessee_phone ?? '—'}</InfoRow>
            <InfoRow label="이메일">{contract.lessee_email ?? '—'}</InfoRow>
            {contract.notes && (
              <InfoRow label="메모">{contract.notes}</InfoRow>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 보증금 거래 내역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">보증금 거래 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {deposits.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">보증금 거래 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>날짜</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(d.transaction_date)}
                    </TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 임대료 청구 내역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">임대료 청구 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">임대료 청구 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>청구년월</TableHead>
                  <TableHead className="text-right">임대료</TableHead>
                  <TableHead className="text-right">부가세</TableHead>
                  <TableHead className="text-right">납부금액</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rents.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-gray-700">
                      {r.billing_year}년 {r.billing_month}월
                    </TableCell>
                    <TableCell className="text-right text-gray-700">{formatKRW(r.amount)}</TableCell>
                    <TableCell className="text-right text-gray-500">{formatKRW(r.vat_amount)}</TableCell>
                    <TableCell className="text-right font-medium text-gray-800">
                      {formatKRW(r.paid_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {rentStatusBadge(r.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
