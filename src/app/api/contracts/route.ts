import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ContractStatus } from '@/types/database'
import { z } from 'zod'

const ContractSchema = z.object({
  property_id: z.string().uuid(),
  contract_number: z.string().min(1).max(50),
  lessee_name: z.string().min(1).max(100),
  lessee_id_number: z.string().optional(),
  lessee_phone: z.string().optional(),
  lessee_email: z.string().email().optional(),
  contract_type: z.enum(['월세', '전세', '반전세']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deposit_amount: z.number().min(0),
  monthly_rent: z.number().min(0),
  monthly_management_fee: z.number().min(0).optional(),
  vat_included: z.boolean().default(false),
  payment_due_day: z.number().int().min(1).max(31).default(1),
  auto_renewal: z.boolean().default(false),
  special_terms: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const propertyId = searchParams.get('property_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('lease_contracts')
    .select(`
      *,
      property:properties!property_id (
        id, name, address_road, property_type, rental_tax_type
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status as ContractStatus)
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = ContractSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // organization_id는 RLS가 자동으로 my_organization_id()로 처리하므로 별도 설정 필요
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'accountant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('lease_contracts')
    .insert({ ...parsed.data, organization_id: profile.organization_id, status: 'active' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
