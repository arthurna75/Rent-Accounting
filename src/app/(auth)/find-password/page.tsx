'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyRound } from 'lucide-react'

export default function FindPasswordPage() {
  const [email, setEmail] = useState('')
  const [actionLink, setActionLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/find-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      setActionLink(json.actionLink)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-bold">비밀번호 찾기</CardTitle>
        <CardDescription>가입한 이메일 주소를 입력하면 재설정 링크를 발급합니다.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {actionLink ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
              <p className="font-medium mb-1">비밀번호 재설정 링크가 준비되었습니다.</p>
              <p className="text-blue-600">아래 버튼을 클릭하여 새 비밀번호를 설정하세요.</p>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => window.location.href = actionLink}
            >
              <KeyRound className="w-4 h-4" />
              비밀번호 재설정 페이지 열기
            </Button>
            <p className="text-xs text-center text-gray-400">
              링크는 1시간 내 1회만 사용 가능합니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="가입 시 사용한 이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '확인 중...' : '재설정 링크 발급'}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="px-0 justify-center gap-4">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
          로그인
        </Link>
        <span className="text-muted-foreground text-sm">·</span>
        <Link href="/find-id" className="text-sm text-muted-foreground hover:text-primary">
          아이디 찾기
        </Link>
      </CardFooter>
    </Card>
  )
}
