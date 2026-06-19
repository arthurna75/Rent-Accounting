import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, password, full_name } = await req.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: '모든 필드를 입력해 주세요.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (error) {
    const isDuplicate =
      error.message.toLowerCase().includes('already') ||
      error.message.toLowerCase().includes('duplicate')
    return NextResponse.json(
      { error: isDuplicate ? '이미 가입된 이메일입니다.' : error.message },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true, userId: data.user.id })
}
