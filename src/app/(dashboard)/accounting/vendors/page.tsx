import { createClient } from '@/lib/supabase/server'
import { SampleVendors } from '@/components/sample/SampleVendors'
import { VendorsClient } from './VendorsClient'
import type { Vendor } from '@/types/database'

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SampleVendors isGuest />

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return <SampleVendors isGuest={false} />

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, business_number, memo, is_active, created_at, updated_at, organization_id')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('name')

  if (!vendors || vendors.length === 0) return <SampleVendors isGuest={false} />

  return <VendorsClient initial={vendors as Vendor[]} />
}
