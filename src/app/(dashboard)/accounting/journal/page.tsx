import { createClient } from '@/lib/supabase/server'
import type { JournalEntryStatus } from '@/types/database'
import { JournalLedgerTable } from '@/components/accounting/JournalLedgerTable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ status?: string; from?: string; to?: string; page?: string }>
}

export default async function JournalPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const page = parseInt(params.page ?? '1')
  const limit = 30
  const offset = (page - 1) * limit

  let query = supabase
    .from('journal_entries')
    .select(`
      id, entry_number, entry_date, description, entry_type, status,
      lines:journal_entry_lines (
        debit_amount, credit_amount,
        account:chart_of_accounts!account_id (code, name)
      )
    `, { count: 'exact' })
    .order('entry_date', { ascending: false })
    .order('entry_number', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.status) query = query.eq('status', params.status as JournalEntryStatus)
  if (params.from) query = query.gte('entry_date', params.from)
  if (params.to) query = query.lte('entry_date', params.to)

  const { data: entries, count } = await query
  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">분개장</h2>
        <Link href="/accounting/journal/new">
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="w-4 h-4" />
            전표 등록
          </Button>
        </Link>
      </div>

      <JournalLedgerTable
        entries={entries ?? []}
        page={page}
        totalPages={totalPages}
        total={count ?? 0}
      />
    </div>
  )
}
