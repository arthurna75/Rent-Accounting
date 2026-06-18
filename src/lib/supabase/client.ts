import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// See server.ts for explanation of the 4-arg form
type TypedClient = SupabaseClient<Database, 'public', 'public', Database['public']>

export function createClient(): TypedClient {
  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return client as unknown as TypedClient
}
