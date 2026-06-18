'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function ContractTerminateButton({ contractId }: { contractId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleTerminate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/contracts')
        router.refresh()
      }
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">정말 해지하시겠습니까?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleTerminate}
          disabled={loading}
        >
          {loading ? '처리 중...' : '확인'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          취소
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
      onClick={() => setConfirming(true)}
    >
      <XCircle className="w-3.5 h-3.5" />
      해지
    </Button>
  )
}
