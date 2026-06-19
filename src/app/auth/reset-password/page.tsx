'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // 코드가 있으면 세션 교환 (Supabase PKCE 복구 흐름)
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError('재설정 링크가 만료되었거나 유효하지 않습니다.')
        else setSessionReady(true)
      })
      return
    }

    // 이미 세션이 있는 경우 (token_hash 방식)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
      else setError('재설정 링크가 만료되었거나 유효하지 않습니다.')
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <p className="text-green-600 font-medium">비밀번호가 성공적으로 변경되었습니다.</p>
        <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다...</p>
      </div>
    )
  }

  if (!sessionReady && !error) {
    return <p className="text-center text-sm text-gray-500">링크 확인 중...</p>
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-500 text-sm">{error}</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/find-password">비밀번호 찾기 다시 시도</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">새 비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="8자 이상 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
        <Input
          id="passwordConfirm"
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '변경 중...' : '비밀번호 변경'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">새 비밀번호 설정</CardTitle>
            <CardDescription>새로운 비밀번호를 입력해 주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-center text-sm text-gray-500">로딩 중...</p>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
