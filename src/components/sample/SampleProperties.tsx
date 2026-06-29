'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_PROPERTIES } from '@/lib/sample-data'
import { PropertiesClient } from '@/app/(dashboard)/properties/PropertiesClient'

export function SampleProperties({ isGuest }: { isGuest: boolean }) {
  const items = SAMPLE_PROPERTIES.map(p => ({
    id: p.id,
    building_name: p.building_name,
    unit_number: p.unit_number,
    address_road: p.address_road,
    address_detail: p.address_detail ?? null,
    property_type: p.property_type,
    building_area: p.building_area,
    acquisition_cost: p.acquisition_cost,
    lease_contracts: p.lease_contracts,
  }))

  return (
    <div className="space-y-4">
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
      <PropertiesClient items={items} />
    </div>
  )
}
