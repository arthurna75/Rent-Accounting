import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email?.trim()) {
    return NextResponse.json({ error: '이메일을 입력해 주세요.' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const origin =
    req.headers.get('origin') ||
    req.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim(),
    options: { redirectTo: `${origin}/auth/reset-password` },
  })

  if (error) {
    return NextResponse.json(
      { error: '등록되지 않은 이메일이거나 오류가 발생했습니다.' },
      { status: 400 },
    )
  }

  return NextResponse.json({ actionLink: data.properties.action_link })
}
