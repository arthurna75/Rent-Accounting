'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  buildings: string[]
  current: string
}

export function BuildingFilter({ buildings, current }: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  function onChange(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set('building', value)
    else params.delete('building')
    router.push(`/contracts?${params.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">건물 전체</option>
      {buildings.map(b => (
        <option key={b} value={b}>{b}</option>
      ))}
    </select>
  )
}
