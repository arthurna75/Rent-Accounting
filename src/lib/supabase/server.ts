import { createServerClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// 4-arg form: SchemaNameOrClientOptions='public', SchemaName='public', Schema=Database['public']
// @supabase/ssr 0.6.1 returns SupabaseClient<D, SchemaName, Schema> (3 args) but supabase-js 2.108.2
// has 5 type params; the 3rd arg maps to SchemaName (string slot) instead of Schema (object slot),
// causing Schema to resolve to never. We cast to the correct 4-arg form instead.
type TypedClient = SupabaseClient<Database, 'public', 'public', Database['public']>

export async function createClient(): Promise<TypedClient> {
  const cookieStore = await cookies()
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    },
  )
  return client as unknown as TypedClient
}

export async function createServiceClient(): Promise<TypedClient> {
  const cookieStore = await cookies()
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
      auth: { persistSession: false },
    },
  )
  return client as unknown as TypedClient
}
