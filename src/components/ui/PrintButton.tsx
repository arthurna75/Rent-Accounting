'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface Props {
  label?: string
  className?: string
}

export function PrintButton({ label = '출력 / PDF 저장', className }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`gap-1.5 ${className ?? ''}`}
      onClick={() => window.print()}
    >
      <Printer className="w-4 h-4" />
      {label}
    </Button>
  )
}
