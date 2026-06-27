import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const VendorSchema = z.object({
  name: z.string().min(1, '거래처명을 입력해 주세요.'),
  business_number: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
  category: z.enum(['중개업', '공공기관', '수리업', '판매업', '기타']).optional().nullable(),
  representative: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  registered_at: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  account_holder: z.string().optional().nullable(),
})

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 거래처별 증빙 미확인 건수 집계
  const { data: unverifiedRows } = await supabase
    .from('journal_entries')
    .select('vendor_id')
    .eq('organization_id', profile.organization_id)
    .not('vendor_id', 'is', null)
    .in('evidence_type', ['현금영수증', '세금계산서'])
    .eq('nts_verified', false)

  const unverifiedMap: Record<string, number> = {}
  for (const row of unverifiedRows ?? []) {
    if (row.vendor_id) {
      unverifiedMap[row.vendor_id] = (unverifiedMap[row.vendor_id] ?? 0) + 1
    }
  }

  const enriched = (data ?? []).map(v => ({
    ...v,
    unverified_evidence_count: unverifiedMap[v.id] ?? 0,
  }))

  return NextResponse.json({ data: enriched })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'accountant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = VendorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('vendors')
    .insert({ ...parsed.data, organization_id: profile.organization_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
