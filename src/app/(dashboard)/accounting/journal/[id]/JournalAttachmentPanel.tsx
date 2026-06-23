'use client'

import { useState, useCallback } from 'react'
import { AttachmentPanel } from '@/components/ui/AttachmentPanel'

interface Props {
  entryId: string
  initialUrls: string[]
  canEdit: boolean
}

export function JournalAttachmentPanel({ entryId, initialUrls, canEdit }: Props) {
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback(async (newUrls: string[]) => {
    setUrls(newUrls)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounting/journal-entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_attachments', attachment_urls: newUrls }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '저장 실패')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '첨부파일 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [entryId])

  return (
    <div className="space-y-2">
      <AttachmentPanel
        urls={urls}
        onChange={handleChange}
        onError={msg => setError(msg)}
        readOnly={!canEdit}
      />
      {saving && <p className="text-xs text-blue-600">저장 중...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
