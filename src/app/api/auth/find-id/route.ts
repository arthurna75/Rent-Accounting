import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const visible = local.slice(0, 2)
  const masked = '*'.repeat(Math.max(local.length - 2, 2))
  return `${visible}${masked}@${domain}`
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }

  const matched = data.users.filter(
    (u) => u.user_metadata?.full_name === name.trim(),
  )

  if (matched.length === 0) {
    return NextResponse.json({ error: '해당 이름으로 가입된 계정이 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({
    emails: matched.map((u) => maskEmail(u.email ?? '')),
  })
}
