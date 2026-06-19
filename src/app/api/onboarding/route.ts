import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 현재 로그인한 사용자 확인
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { orgName, businessNumber, ownerName, rentalType } = await req.json()
  if (!orgName || !rentalType) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  // 이미 프로필(=조직)이 있으면 중복 방지
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (existing?.organization_id) {
    return NextResponse.json({ ok: true, alreadyExists: true })
  }

  // 서비스 롤 키로 RLS 우회 insert
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // 1. organizations 생성
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: orgName,
      business_number: businessNumber?.replace(/-/g, '') || null,
      owner_name: ownerName,
      rental_type: rentalType,
      email: user.email!,
      fiscal_year_start_month: 1,
    })
    .select()
    .single()

  if (orgError) {
    console.error('org insert error:', orgError)
    const isDuplicate = orgError.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? '이미 등록된 이메일로 조직이 존재합니다. 관리자에게 문의하세요.' : orgError.message },
      { status: isDuplicate ? 409 : 500 },
    )
  }

  // 2. user_profiles 생성
  const { error: profileError } = await admin
    .from('user_profiles')
    .upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? ownerName,
      organization_id: org.id,
      role: 'owner',
    })

  if (profileError) {
    console.error('profile insert error:', profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
