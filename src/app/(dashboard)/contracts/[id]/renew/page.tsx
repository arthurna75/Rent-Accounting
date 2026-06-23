import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import RenewalForm from './RenewalForm'

export default async function RenewContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: contract, error } = await supabase
    .from('lease_contracts')
    .select(`
      id, property_id, organization_id,
      lessee_name, lessee_phone, lessee_email, lessee_id_number,
      contract_type, contract_number,
      deposit_amount, monthly_rent, monthly_management_fee,
      vat_included, payment_due_day, start_date, end_date, notes, status,
      property:properties!property_id(building_name, unit_number, address_road)
    `)
    .eq('id', id)
    .single()

  if (error || !contract) notFound()
  if (contract.status === 'terminated') notFound()

  // 다음 계약번호 생성
  const today = new Date()
  const yyyy  = today.getFullYear()
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const dd    = String(today.getDate()).padStart(2, '0')
  const prefix = `${yyyy}${mm}${dd}`
  const { count } = await supabase
    .from('lease_contracts')
    .select('*', { count: 'exact', head: true })
    .like('contract_number', `${prefix}_%`)
  const nextNumber = `${prefix}_${String((count ?? 0) + 1).padStart(2, '0')}`

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href={`/contracts/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="w-4 h-4" />
            계약 상세
          </Button>
        </Link>
        <h2 className="text-xl font-semibold text-gray-900">계약 변경</h2>
        <span className="text-sm text-gray-400">
          {(contract.property as { building_name: string; unit_number: string } | null)?.building_name}
          {(contract.property as { building_name: string; unit_number: string } | null)?.unit_number
            ? ' ' + (contract.property as { building_name: string; unit_number: string }).unit_number
            : ''}
        </span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <RenewalForm originalContract={contract as any} nextContractNumber={nextNumber} />
    </div>
  )
}
