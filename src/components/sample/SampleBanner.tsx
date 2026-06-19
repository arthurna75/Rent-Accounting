'use client'

import Link from 'next/link'
import { FlaskConical } from 'lucide-react'

export function SampleBanner({ isGuest = false }: { isGuest?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 mb-5 text-sm">
      <div className="flex items-center gap-2 text-amber-700">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span className="font-medium">예시 데이터입니다.</span>
        <span className="text-amber-600 hidden sm:inline">
          {isGuest
            ? '회원가입 후 내 부동산·계약 정보를 등록하면 실제 데이터로 표시됩니다.'
            : '데이터를 등록하면 실제 현황으로 바뀝니다.'}
        </span>
      </div>
      {isGuest && (
        <Link
          href="/register"
          className="shrink-0 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          무료 가입
        </Link>
      )}
    </div>
  )
}
