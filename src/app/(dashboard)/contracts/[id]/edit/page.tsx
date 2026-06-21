import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContractEditForm from './ContractEditForm'

export default async function ContractEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [contractResult, propertiesResult] = await Promise.all([
    supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('properties')
      .select('id, building_name, unit_number, address_road')
      .eq('is_active', true)
      .order('building_name')
      .order('unit_number'),
  ])

  if (contractResult.error || !contractResult.data) notFound()

  return (
    <ContractEditForm
      contract={contractResult.data as never}
      properties={(propertiesResult.data ?? []) as never}
    />
  )
}
