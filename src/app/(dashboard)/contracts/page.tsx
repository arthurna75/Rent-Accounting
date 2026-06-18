import { createClient } from '@/lib/supabase/server'
import { formatKRW, formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

type ContractStatus = 'active' | 'expired' | 'terminated'
type ContractType = '월세' | '전세' | '반전세'

interface LeaseContract {
  id: string
  lessee_name: string
  contract_type: ContractType
  deposit_amount: number
  monthly_rent: number
  start_date: string
  end_date: string
  status: ContractStatus
  property: { name: string } | null
}

const STATUS_TABS = [
  { key: undefined,       label: '전체' },
  { key: 'active',       label: '활성' },
  { key: 'expired',      label: '만료' },
  { key: 'terminated',   label: '해지' },
] as const

function statusBadge(status: ContractStatus) {
  const map: Record<ContractStatus, { label: string; className: string }> = {
    active:     { label: '활성', className: 'bg-green-100 text-green-700 border-green-200' },
    expired:    { label: '만료', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    terminated: { label: '해지', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = map[status]
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>
}

function contractTypeBadge(type: ContractType) {
  const map: Record<ContractType, { label: string; className: string }> = {
    월세:   { label: '월세',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
    전세:   { label: '전세',   className: 'bg-purple-100 text-purple-700 border-purple-200' },
    반전세: { label: '반전세', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  }
  const s = map[type] ?? { label: type, className: 'bg-gray-100 text-gray-600 border-gray-200' }
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function DDay({ dateStr }: { dateStr: string }) {
  const d = daysUntil(dateStr)
  const label = d >= 0 ? `D-${d}` : `D+${Math.abs(d)}`
  const cls =
    d <= 30 ? 'text-red-600 font-semibold' :
    d <= 90 ? 'text-orange-500 font-semibold' :
    'text-gray-400'
  return <span className={cls}>{label}</span>
}

export default async function ContractsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const activeStatus = params.status as ContractStatus | undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-gray-400">로그인 후 이용할 수 있습니다.</p>
    </div>
  )

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const baseQuery = () =>
    supabase
      .from('lease_contracts')
      .select('id, status', { count: 'exact', head: true })
      .eq('organization_id', profile!.organization_id)

  const [allCount, activeCount, expiredCount, terminatedCount] = await Promise.all([
    baseQuery(),
    baseQuery().eq('status', 'active'),
    baseQuery().eq('status', 'expired'),
    baseQuery().eq('status', 'terminated'),
  ])

  const counts: Record<string, number> = {
    all:        allCount.count ?? 0,
    active:     activeCount.count ?? 0,
    expired:    expiredCount.count ?? 0,
    terminated: terminatedCount.count ?? 0,
  }

  let query = supabase
    .from('lease_contracts')
    .select('*, property:properties!property_id(name)')
    .eq('organization_id', profile!.organization_id)
    .order('end_date', { ascending: true })

  if (activeStatus) query = query.eq('status', activeStatus)

  const { data: contracts } = await query
  const list = (contracts ?? []) as unknown as LeaseContract[]

  const tabCountKey = (key: string | undefined) => key ?? 'all'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">임대계약 관리</h2>
        <Link href="/contracts/new">
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="w-4 h-4" />
            계약 등록
          </Button>
        </Link>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map(tab => {
          const isActive = activeStatus === tab.key
          const count = counts[tabCountKey(tab.key)]
          return (
            <Link
              key={tabCountKey(tab.key)}
              href={tab.key ? `/contracts?status=${tab.key}` : '/contracts'}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* 계약 테이블 */}
      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">계약 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>부동산</TableHead>
                  <TableHead>임차인</TableHead>
                  <TableHead>계약유형</TableHead>
                  <TableHead className="text-right">보증금</TableHead>
                  <TableHead className="text-right">월세</TableHead>
                  <TableHead>계약기간</TableHead>
                  <TableHead className="text-center">만료까지</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(c => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                  >
                    <TableCell>
                      <Link href={`/contracts/${c.id}`} className="block">
                        <span className="font-medium text-gray-800">
                          {c.property?.name ?? '—'}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/contracts/${c.id}`} className="block text-gray-700">
                        {c.lessee_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/contracts/${c.id}`} className="block">
                        {contractTypeBadge(c.contract_type)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/contracts/${c.id}`} className="block text-gray-700">
                        {formatKRW(c.deposit_amount)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/contracts/${c.id}`} className="block text-gray-700">
                        {c.contract_type === '전세' ? '—' : formatKRW(c.monthly_rent)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/contracts/${c.id}`} className="block text-xs text-gray-500">
                        {formatDate(c.start_date)} ~ {formatDate(c.end_date)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/contracts/${c.id}`} className="block">
                        <DDay dateStr={c.end_date} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/contracts/${c.id}`} className="block">
                        {statusBadge(c.status)}
                      </Link>
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
