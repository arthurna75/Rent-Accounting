import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'
import { PlusCircle } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_CONTRACTS } from '@/lib/sample-data'

const STATUS_MAP = {
  active:     { label: '활성', className: 'bg-green-100 text-green-700 border-green-200' },
  expired:    { label: '만료', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  terminated: { label: '해지', className: 'bg-red-100 text-red-700 border-red-200' },
}
const TYPE_MAP = {
  월세:   'bg-blue-100 text-blue-700 border-blue-200',
  전세:   'bg-purple-100 text-purple-700 border-purple-200',
  반전세: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) }

export function SampleContracts({ isGuest }: { isGuest: boolean }) {
  const activeCount = SAMPLE_CONTRACTS.filter(c => c.status === 'active').length
  const expiredCount = SAMPLE_CONTRACTS.filter(c => c.status === 'expired').length

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">임대계약 관리</h2>
        <Link href={isGuest ? '/register' : '/contracts/new'}>
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="w-4 h-4" />
            계약 등록
          </Button>
        </Link>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { label: '전체', count: SAMPLE_CONTRACTS.length },
          { label: '활성', count: activeCount },
          { label: '만료', count: expiredCount },
          { label: '해지', count: 0 },
        ].map((tab, i) => (
          <div key={i} className={`px-4 py-2 text-sm font-medium border-b-2 ${i === 0 ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${i === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {tab.count}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
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
              {SAMPLE_CONTRACTS.map(c => {
                const days = daysUntil(c.end_date)
                const status = STATUS_MAP[c.status]
                const dLabel = days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`
                const dCls = days <= 30 ? 'text-red-600 font-semibold' : days <= 90 ? 'text-orange-500 font-semibold' : 'text-gray-400'
                return (
                  <TableRow key={c.id} className="hover:bg-blue-50/40">
                    <TableCell className="font-medium text-gray-800">{c.property_name}</TableCell>
                    <TableCell className="text-gray-700">{c.lessee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TYPE_MAP[c.contract_type]}>{c.contract_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-gray-700">{formatKRW(c.deposit_amount)}</TableCell>
                    <TableCell className="text-right text-gray-700">
                      {c.contract_type === '전세' ? '—' : formatKRW(c.monthly_rent)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{c.start_date} ~ {c.end_date}</TableCell>
                    <TableCell className="text-center"><span className={dCls}>{dLabel}</span></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
