'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface JournalActionsProps {
  entryId: string
  status: 'draft' | 'posted' | 'reversed'
  isReversed: boolean
  canApprove: boolean
}

export function JournalActions({
  entryId,
  status,
  isReversed,
  canApprove,
}: JournalActionsProps) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [reversing, setReversing] = useState(false)
  const [reversalDate, setReversalDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const showApprove = status === 'draft' && canApprove
  const showReverse = status === 'posted' && !isReversed && canApprove

  if (!showApprove && !showReverse) return null

  async function handleApprove() {
    setError(null)
    setApproving(true)
    try {
      const res = await fetch(`/api/accounting/journal-entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? `오류 ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '승인 중 오류가 발생했습니다.')
    } finally {
      setApproving(false)
    }
  }

  async function handleReverse() {
    if (!reversalDate) {
      setError('역분개 날짜를 입력해 주세요.')
      return
    }
    setError(null)
    setReversing(true)
    try {
      const res = await fetch(`/api/accounting/journal-entries/${entryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reverse', reversal_date: reversalDate }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? `오류 ${res.status}`)
      }
      router.push('/accounting/journal')
    } catch (e) {
      setError(e instanceof Error ? e.message : '역분개 중 오류가 발생했습니다.')
      setReversing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {showApprove && (
        <Button
          onClick={handleApprove}
          disabled={approving}
          className="w-full sm:w-auto"
        >
          {approving ? '승인 중…' : '승인'}
        </Button>
      )}

      {showReverse && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="date"
            value={reversalDate}
            onChange={e => setReversalDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="역분개 날짜"
          />
          <Button
            variant="destructive"
            onClick={handleReverse}
            disabled={reversing}
          >
            {reversing ? '역분개 중…' : '역분개 실행'}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
