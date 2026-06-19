import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/utils/format'
import { Building2, Plus } from 'lucide-react'
import { SampleProperties } from '@/components/sample/SampleProperties'

type Property = {
  id: string
  name: string
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

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SampleProperties isGuest />

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return <SampleProperties isGuest={false} />

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, name, address_road, address_detail, property_type, building_area, acquisition_cost, lease_contracts!property_id(status)')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[properties] query error:', error.message)
  }

  const list = (properties ?? []) as unknown as Property[]
  if (list.length === 0) return <SampleProperties isGuest={false} />

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(p => {
          const activeContracts = (p.lease_contracts ?? []).filter(c => c.status === 'active').length
          const address = [p.address_road, p.address_detail].filter(Boolean).join(' ')
          const badgeCls = TYPE_BADGE[p.property_type] ?? TYPE_BADGE['기타']
          return (
            <Link key={p.id} href={`/properties/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-gray-900 leading-snug">
                      {p.name}
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${activeContracts > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
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
  )
}
