import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatKRW, formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react'
import ContractTerminateButton from './TerminateButton'
import DepositJournalSection from './DepositJournalSection'
import RentJournalSection from './RentJournalSection'
import ExpenseSection from './ExpenseSection'

interface PageProps {
  params: Promise<{ id: string }>
}

type ContractStatus = 'active' | 'expired' | 'terminated'
type ContractType = '월세' | '전세' | '반전세'
type DepositTxType = '수령' | '반환' | '증액' | '감액'

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
  status: string
}

interface Property {
  building_name: string
  unit_number: string
  address_road: string | null
  property_type: string | null
}

interface LeaseContract {
  id: string
  lessee_name: string
  lessee_phone: string | null
  lessee_email: string | null
  lessee_id_number: string | null
  contract_type: ContractType
  deposit_amount: number
  monthly_rent: number
  monthly_management_fee: number | null
  vat_included: boolean
  payment_condition: '선불' | '후불'
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
      .select('*, monthly_management_fee, payment_condition, property:properties!property_id(building_name, unit_number, address_road, property_type)')
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

  // journal entries 조회
  const { data: linkedLines } = await supabase
    .from('journal_entry_lines')
    .select('journal_entry_id')
    .eq('contract_id', id)

  const entryIds = [...new Set((linkedLines ?? []).map(r => r.journal_entry_id as string))]

  const contractEntries = entryIds.length > 0
    ? ((await supabase
        .from('journal_entries')
        .select('id, entry_date, entry_type, status, description, entry_number, lines:journal_entry_lines(debit_amount, credit_amount)')
        .in('id', entryIds)
        .order('entry_date', { ascending: false })
      ).data ?? [])
    : []

  const depositEntries = contractEntries.filter(e => ['보증금수령', '보증금반환'].includes(e.entry_type))
  const rentEntries = contractEntries.filter(e => ['임대수익', '관리비'].includes(e.entry_type))
  const expenseEntries = contractEntries.filter(e => e.entry_type === '비용지출')

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
            <Link href={`/contracts/${id}/renew`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                <RefreshCw className="w-3.5 h-3.5" />
                계약 변경
              </Button>
            </Link>
          )}
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
            <InfoRow label="부동산">
              {contract.property
                ? `${contract.property.building_name}${contract.property.unit_number ? ' ' + contract.property.unit_number : ''}`
                : '—'}
            </InfoRow>
            <InfoRow label="주소">{contract.property?.address_road ?? '—'}</InfoRow>
            <InfoRow label="계약유형">{contract.contract_type}</InfoRow>
            <InfoRow label="보증금">{formatKRW(contract.deposit_amount)}</InfoRow>
            {contract.contract_type !== '전세' && (
              <InfoRow label="월세">{formatKRW(contract.monthly_rent)}</InfoRow>
            )}
            <InfoRow label="부가세 포함">{contract.vat_included ? '포함' : '미포함'}</InfoRow>
            {contract.contract_type !== '전세' && (
              <InfoRow label="지급조건">{contract.payment_condition ?? '선불'}</InfoRow>
            )}
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
            {contract.lessee_id_number && (
              <InfoRow label="주민번호">
                {contract.lessee_id_number.split('-')[0]}-{contract.lessee_id_number.split('-')[1]}●●●●●●
              </InfoRow>
            )}
            {contract.notes && (
              <InfoRow label="메모">{contract.notes}</InfoRow>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 보증금 거래 내역 */}
      <DepositJournalSection
        contractId={id}
        depositAmount={contract.deposit_amount}
        lesseeName={contract.lessee_name}
        deposits={deposits}
        entries={depositEntries}
      />

      {/* 임대료 청구 내역 */}
      <RentJournalSection
        contractId={id}
        monthlyRent={contract.monthly_rent}
        managementFee={contract.monthly_management_fee}
        lesseeName={contract.lessee_name}
        startDate={contract.start_date}
        endDate={contract.end_date}
        contractType={contract.contract_type}
        paymentCondition={contract.payment_condition ?? '선불'}
        rents={rents}
        entries={rentEntries}
      />

      {/* 비용지출 내역 */}
      <ExpenseSection
        contractId={id}
        lesseeName={contract.lessee_name}
        entries={expenseEntries}
      />
    </div>
  )
}
