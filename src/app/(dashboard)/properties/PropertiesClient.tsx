'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'
import { Building2, LayoutGrid, List } from 'lucide-react'

export type PropertyItem = {
  id: string
  building_name: string
  unit_number: string
  address_road: string
  address_detail: string | null
  property_type: string
  building_area: number | null
  acquisition_cost: number | null
  lease_contracts: { status: string }[]
}

const TYPE_BADGE: Record<string, string> = {
  아파트:       'bg-blue-100 text-blue-700',
  다세대:       'bg-sky-100 text-sky-700',
  단독주택:     'bg-green-100 text-green-700',
  상가:         'bg-orange-100 text-orange-700',
  오피스텔:     'bg-purple-100 text-purple-700',
  근린생활시설:  'bg-yellow-100 text-yellow-700',
  기타:         'bg-gray-100 text-gray-700',
}

// 숫자를 포함한 문자열 자연 정렬 (1호 < 2호 < 10호)
function naturalCmp(a: string, b: string) {
  return a.localeCompare(b, 'ko', { numeric: true, sensitivity: 'base' })
}

export function PropertiesClient({ items }: { items: PropertyItem[] }) {
  const [view, setView] = useState<'card' | 'table'>('card')

  // 건물명 → 호실 자연 정렬
  const sorted = useMemo(() =>
    [...items].sort((a, b) => {
      const bldCmp = naturalCmp(a.building_name, b.building_name)
      if (bldCmp !== 0) return bldCmp
      return naturalCmp(a.unit_number, b.unit_number)
    }),
    [items],
  )

  // 건물명별 그룹핑
  const groups = useMemo(() => {
    const map = new Map<string, PropertyItem[]>()
    for (const p of sorted) {
      if (!map.has(p.building_name)) map.set(p.building_name, [])
      map.get(p.building_name)!.push(p)
    }
    return [...map.entries()]
  }, [sorted])

  return (
    <div className="space-y-4">
      {/* 뷰 토글 버튼 */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => setView('card')}
          className={`p-1.5 rounded-md transition-colors ${
            view === 'card'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="카드 보기"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setView('table')}
          className={`p-1.5 rounded-md transition-colors ${
            view === 'table'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="행렬 보기"
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {view === 'card' ? (
        /* ── 카드 뷰 ── */
        <div className="space-y-6">
          {groups.map(([buildingName, units]) => (
            <div key={buildingName} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Building2 className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">{buildingName}</h3>
                <span className="text-xs text-gray-400">{units.length}호실</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {units.map(p => {
                  const activeContracts = p.lease_contracts.filter(c => c.status === 'active').length
                  const address = [p.address_road, p.address_detail].filter(Boolean).join(' ')
                  const badgeCls = TYPE_BADGE[p.property_type] ?? TYPE_BADGE['기타']
                  return (
                    <Link key={p.id} href={`/properties/${p.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-semibold text-gray-900 leading-snug">
                              {p.unit_number
                                ? <><span>{p.building_name}</span> <span className="text-blue-600">{p.unit_number}</span></>
                                : p.building_name
                              }
                            </CardTitle>
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`}>
                              {p.property_type}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-xs text-gray-500 line-clamp-1">{address}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 pt-1">
                            {p.building_area != null && (
                              <div>
                                <span className="text-gray-400">면적 </span>
                                {p.building_area.toLocaleString('ko-KR')}㎡
                              </div>
                            )}
                            {p.acquisition_cost != null && (
                              <div>
                                <span className="text-gray-400">취득가 </span>
                                {formatKRW(p.acquisition_cost)}
                              </div>
                            )}
                          </div>
                          <div className="pt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeContracts > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              활성 계약 {activeContracts}건
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── 행렬(테이블) 뷰 ── */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>건물명</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="hidden md:table-cell">주소</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">면적(㎡)</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">취득가</TableHead>
                  <TableHead className="text-center">활성계약</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p, i) => {
                  const activeContracts = p.lease_contracts.filter(c => c.status === 'active').length
                  const address = [p.address_road, p.address_detail].filter(Boolean).join(' ')
                  const badgeCls = TYPE_BADGE[p.property_type] ?? TYPE_BADGE['기타']
                  // 같은 건물명이 이전 행과 겹치면 rowspan 느낌으로 살짝 dim
                  const prevBuilding = i > 0 ? sorted[i - 1].building_name : null
                  const sameBuilding = prevBuilding === p.building_name
                  return (
                    <TableRow
                      key={p.id}
                      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                        sameBuilding ? 'border-t-0' : 'border-t-2 border-gray-100'
                      }`}
                    >
                      <TableCell>
                        <Link href={`/properties/${p.id}`} className="block">
                          {sameBuilding ? (
                            <span className="text-gray-300 text-xs">↳</span>
                          ) : (
                            <span className="font-medium text-gray-800">{p.building_name}</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/properties/${p.id}`} className="block">
                          <span className="text-blue-600 font-medium">
                            {p.unit_number || '—'}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/properties/${p.id}`} className="block">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`}>
                            {p.property_type}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[200px] hidden md:table-cell">
                        <Link href={`/properties/${p.id}`} className="block truncate">
                          {address}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700 hidden lg:table-cell">
                        <Link href={`/properties/${p.id}`} className="block">
                          {p.building_area != null ? p.building_area.toLocaleString('ko-KR') : '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700 hidden lg:table-cell">
                        <Link href={`/properties/${p.id}`} className="block">
                          {p.acquisition_cost != null ? formatKRW(p.acquisition_cost) : '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/properties/${p.id}`} className="block">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            activeContracts > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {activeContracts}건
                          </span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
