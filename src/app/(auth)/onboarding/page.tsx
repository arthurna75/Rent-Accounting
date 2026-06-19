'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type RentalType = '주택' | '상가' | '혼합'

export default function OnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [rentalType, setRentalType] = useState<RentalType | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function formatBusinessNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!rentalType) {
      setError('임대 유형을 선택해 주세요.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName,
        businessNumber,
        ownerName,
        rentalType,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? '저장 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-bold">사업자 정보 입력</CardTitle>
        <CardDescription>
          서비스 이용을 위해 사업자 정보를 입력해 주세요.
          <br />
          추후 설정에서 수정할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">조직명 (상호)</Label>
            <Input
              id="orgName"
              type="text"
              placeholder="예: 홍길동 임대사업"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessNumber">사업자등록번호</Label>
            <Input
              id="businessNumber"
              type="text"
              placeholder="000-00-00000"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerName">대표자명</Label>
            <Input
              id="ownerName"
              type="text"
              placeholder="홍길동"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rentalType">임대 유형</Label>
            <Select value={rentalType} onValueChange={(v) => setRentalType(v as RentalType)}>
              <SelectTrigger id="rentalType">
                <SelectValue placeholder="임대 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="주택">주택임대</SelectItem>
                <SelectItem value="상가">상가임대</SelectItem>
                <SelectItem value="혼합">복합 (주택+상가)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '저장 중...' : '시작하기'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
