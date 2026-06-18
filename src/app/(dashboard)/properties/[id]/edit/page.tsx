import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PropertyEditForm from './PropertyEditForm'

export default async function PropertyEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <PropertyEditForm property={data as never} />
}
