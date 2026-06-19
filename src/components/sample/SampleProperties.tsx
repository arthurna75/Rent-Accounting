import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatKRW } from '@/lib/utils/format'
import { Plus } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_PROPERTIES } from '@/lib/sample-data'

const typeBadge: Record<string, string> = {
  아파트:   'bg-blue-100 text-blue-700',
  다세대:   'bg-blue-100 text-blue-700',
  상가:     'bg-orange-100 text-orange-700',
  오피스텔: 'bg-purple-100 text-purple-700',
  기타:     'bg-gray-100 text-gray-700',
}

export function SampleProperties({ isGuest }: { isGuest: boolean }) {
  return (
    <div className="space-y-6">
      <SampleBanner isGuest={isGuest} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">부동산 관리</h2>
        <Button asChild>
          <Link href={isGuest ? '/register' : '/properties/new'}>
            <Plus className="w-4 h-4 mr-1" />
            부동산 등록
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SAMPLE_PROPERTIES.map(p => (
          <Card key={p.id} className="h-full opacity-90 cursor-default">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold text-gray-900 leading-snug">{p.name}</CardTitle>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[p.property_type] ?? typeBadge['기타']}`}>
                  {p.property_type}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-gray-500 line-clamp-1">{p.address_road}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 pt-1">
                <div><span className="text-gray-400">면적 </span>{p.building_area}㎡</div>
                <div><span className="text-gray-400">취득가 </span>{formatKRW(p.acquisition_cost)}</div>
              </div>
              <div className="pt-1">
                <Badge variant={p.activeContracts > 0 ? 'default' : 'secondary'} className="text-xs">
                  활성 계약 {p.activeContracts}건
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
