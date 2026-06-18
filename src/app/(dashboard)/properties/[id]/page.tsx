import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW, formatDate } from '@/lib/utils/format'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'

type LeaseContract = {
  id: string
  lessee_name: string
  monthly_rent: number
  deposit_amount: number
  start_date: string
  end_date: string
  status: string
}

type Property = {
  id: string
  name: string
  address_road: string
  address_detail: string | null
  property_type: string
  rental_tax_type: '과세' | '면세'
  acquisition_cost: number | null
  acquisition_date: string | null
  building_area: number | null
  useful_life: number
  depreciation_method: string
  salvage_value: number
  notes: string | null
  is_active: boolean
  lease_contracts: LeaseContract[]
}

const typeBadgeClass: Record<string, string> = {
  주택: 'bg-blue-100 text-blue-700',
  상가: 'bg-orange-100 text-orange-700',
  오피스텔: 'bg-purple-100 text-purple-700',
  기타: 'bg-gray-100 text-gray-700',
}

const contractStatusLabel: Record<string, string> = {
  active: '진행 중',
  terminated: '해지',
  expired: '만료',
}

function calcBookValue(p: Property): number | null {
  if (p.acquisition_cost == null || !p.acquisition_date) return null
  const acquiredYear = new Date(p.acquisition_date).getFullYear()
  const currentYear = new Date().getFullYear()
  const elapsed = Math.min(currentYear - acquiredYear, p.useful_life)
  const depreciable = p.acquisition_cost - p.salvage_value
  const annualDep = depreciable / p.useful_life
  return Math.max(p.salvage_value, p.acquisition_cost - annualDep * elapsed)
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('properties')
    .select('*, lease_contracts(id, lessee_name, monthly_rent, deposit_amount, start_date, end_date, status)')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const property = (data as unknown) as Property
  const bookValue = calcBookValue(property)
  const activeContracts = property.lease_contracts.filter(c => c.status === 'active')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">
            <ArrowLeft className="w-4 h-4 mr-1" />
            부동산 목록
          </Link>
        </Button>
      </div>

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">{property.name}</h2>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass[property.property_type] ?? typeBadgeClass['기타']}`}>
            {property.property_type}
          </span>
          {!property.is_active && (
            <Badge variant="secondary" className="text-xs">비활성</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/properties/${id}/edit`}>
            <Pencil className="w-4 h-4 mr-1" />
            수정
          </Link>
        </Button>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">주소</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {property.address_road}{property.address_detail ? ` ${property.address_detail}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">과세유형</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{property.rental_tax_type}</dd>
            </div>
            {property.acquisition_cost != null && (
              <div>
                <dt className="text-xs text-gray-500">취득가액</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">{formatKRW(property.acquisition_cost)}</dd>
              </div>
            )}
            {property.acquisition_date && (
              <div>
                <dt className="text-xs text-gray-500">취득일</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">{formatDate(property.acquisition_date)}</dd>
              </div>
            )}
            {property.building_area != null && (
              <div>
                <dt className="text-xs text-gray-500">건물면적</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">{property.building_area.toLocaleString('ko-KR')}㎡</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">내용연수 / 상각방법</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{property.useful_life}년 / {property.depreciation_method}</dd>
            </div>
            {bookValue != null && (
              <div>
                <dt className="text-xs text-gray-500">현재 장부가액 (추정)</dt>
                <dd className="mt-0.5 text-sm font-semibold text-blue-700">{formatKRW(bookValue)}</dd>
              </div>
            )}
            {property.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500">메모</dt>
                <dd className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{property.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* 임대계약 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              임대계약
              {activeContracts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">활성 {activeContracts.length}건</span>
              )}
            </CardTitle>
            <Button size="sm" asChild>
              <Link href={`/contracts/new?propertyId=${id}`}>
                <Plus className="w-4 h-4 mr-1" />
                새 계약 등록
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {property.lease_contracts.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">등록된 임대계약이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>임차인</TableHead>
                  <TableHead className="text-right">월세</TableHead>
                  <TableHead className="text-right">보증금</TableHead>
                  <TableHead>계약기간</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.lease_contracts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/contracts/${c.id}`} className="hover:underline text-blue-700">
                        {c.lessee_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatKRW(c.monthly_rent)}</TableCell>
                    <TableCell className="text-right">{formatKRW(c.deposit_amount)}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDate(c.start_date)} ~ {formatDate(c.end_date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {contractStatusLabel[c.status] ?? c.status}
                      </Badge>
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
