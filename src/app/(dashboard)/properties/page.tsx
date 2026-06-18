import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/utils/format'
import { Building2, Plus } from 'lucide-react'

type Property = {
  id: string
  name: string
  address: string
  property_type: '주택' | '상가' | '오피스텔' | '기타'
  area_sqm: number | null
  acquisition_cost: number | null
  lease_contracts: { status: string }[]
}

const typeBadgeVariant: Record<string, string> = {
  주택: 'bg-blue-100 text-blue-700',
  상가: 'bg-orange-100 text-orange-700',
  오피스텔: 'bg-purple-100 text-purple-700',
  기타: 'bg-gray-100 text-gray-700',
}

export default async function PropertiesPage() {
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

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address, property_type, area_sqm, acquisition_cost, lease_contracts(status)')
    .eq('organization_id', profile!.organization_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const list = (properties ?? []) as unknown as Property[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">부동산 관리</h2>
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="w-4 h-4 mr-1" />
            부동산 등록
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">등록된 부동산이 없습니다.</p>
          <p className="text-gray-400 text-xs mt-1">첫 부동산을 등록해 보세요.</p>
          <Button asChild className="mt-4">
            <Link href="/properties/new">부동산 등록</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(p => {
            const activeContracts = p.lease_contracts.filter(c => c.status === 'active').length
            return (
              <Link key={p.id} href={`/properties/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-gray-900 leading-snug">
                        {p.name}
                      </CardTitle>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeVariant[p.property_type] ?? typeBadgeVariant['기타']}`}>
                        {p.property_type}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-gray-500 line-clamp-1">{p.address}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 pt-1">
                      {p.area_sqm != null && (
                        <div>
                          <span className="text-gray-400">면적 </span>
                          {p.area_sqm.toLocaleString('ko-KR')}㎡
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
                      <Badge variant={activeContracts > 0 ? 'default' : 'secondary'} className="text-xs">
                        활성 계약 {activeContracts}건
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
