import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SampleProperties } from '@/components/sample/SampleProperties'
import { PropertiesClient } from './PropertiesClient'

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
    .select('id, building_name, unit_number, address_road, address_detail, property_type, building_area, acquisition_cost, lease_contracts!property_id(status)')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)

  if (error) {
    console.error('[properties] query error:', error.message)
  }

  const list = (properties ?? []) as Parameters<typeof PropertiesClient>[0]['items']
  if (list.length === 0) return <SampleProperties isGuest={false} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">부동산 관리</h2>
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="w-4 h-4 mr-1" />
            부동산 등록
          </Link>
        </Button>
      </div>

      <PropertiesClient items={list} />
    </div>
  )
}
