'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2 } from 'lucide-react'

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
  const [deleting, setDeleting] = useState(false)
  const [reversalDate, setReversalDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const showApprove = status === 'draft' && canApprove
  const showReverse = status === 'posted' && !isReversed && canApprove
  const canEdit   = status !== 'reversed' && canApprove
  const canDelete = status !== 'reversed' && canApprove

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

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/accounting/journal-entries/${entryId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `오류 ${res.status}`)
      }
      router.push('/accounting/journal')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.')
      setDeleting(false)
    }
  }

  if (!showApprove && !showReverse && !canEdit && !canDelete) return null

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* 수정 / 삭제 버튼 */}
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href={`/accounting/journal/${entryId}/edit`}>
                  <Pencil className="w-4 h-4" />수정
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? '삭제 중...' : '삭제'}
              </Button>
            )}
          </div>
        )}

        {/* 승인 버튼 */}
        {showApprove && (
          <Button
            onClick={handleApprove}
            disabled={approving}
            className="w-full sm:w-auto"
          >
            {approving ? '승인 중…' : '승인'}
          </Button>
        )}

        {/* 역분개 */}
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

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전표 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 전표를 삭제합니다. 삭제된 전표는 복구할 수 없습니다.
              {status === 'posted' && (
                <span className="block mt-1 font-medium text-amber-700">
                  ※ 승인완료(posted) 전표입니다. 신중하게 확인하세요.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
