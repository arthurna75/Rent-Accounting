import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PropertySchema = z.object({
  building_name: z.string().min(1).max(100),
  unit_number: z.string().max(50).default(''),
  address_road: z.string().min(1),
  address_detail: z.string().optional(),
  property_type: z.enum(['아파트', '다세대', '단독주택', '상가', '오피스텔', '근린생활시설', '기타']),
  rental_tax_type: z.enum(['과세', '면세']).default('과세'),
  acquisition_cost: z.number().min(0),
  acquisition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  building_value: z.number().min(0).optional(),
  useful_life: z.number().int().min(1).default(40),
  depreciation_method: z.enum(['정액법', '정률법']).default('정액법'),
  salvage_value: z.number().min(0).default(0),
  building_area: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isActiveParam = searchParams.get('is_active')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .order('building_name', { ascending: true })
    .order('unit_number', { ascending: true })
    .range(offset, offset + limit - 1)

  if (isActiveParam !== null) {
    query = query.eq('is_active', isActiveParam === 'true')
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count ?? 0, page })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = PropertySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'accountant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('properties')
    .insert({ ...parsed.data, organization_id: profile.organization_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
