'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function FindIdPage() {
  const [name, setName] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      setEmails(json.emails)
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-bold">아이디(이메일) 찾기</CardTitle>
        <CardDescription>가입 시 입력한 이름으로 이메일을 찾을 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">아래 이메일로 가입된 계정을 찾았습니다.</p>
            <ul className="space-y-2">
              {emails.map((email, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm font-semibold tracking-wider text-gray-800"
                >
                  {email}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full mt-2">
              <Link href="/login">로그인하기</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="가입 시 입력한 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '조회 중...' : '아이디 찾기'}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="px-0 justify-center gap-4">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
          로그인
        </Link>
        <span className="text-muted-foreground text-sm">·</span>
        <Link href="/find-password" className="text-sm text-muted-foreground hover:text-primary">
          비밀번호 찾기
        </Link>
      </CardFooter>
    </Card>
  )
}
