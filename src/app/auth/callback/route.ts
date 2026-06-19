import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c: { name: string; value: string; options?: Record<string, unknown> }[]) =>
            c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/reset-password`)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
