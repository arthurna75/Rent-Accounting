'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock } from 'lucide-react'

interface LoginModalProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  description?: string
  defaultTab?: 'login' | 'register'
}

export function LoginModal({ open, onOpenChange, description, defaultTab = 'login' }: LoginModalProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab)

  // 모달이 열릴 때마다 defaultTab으로 탭 초기화
  useEffect(() => {
    if (open) setTab(defaultTab)
  }, [open, defaultTab])

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Register
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  const dismissable = !!onOpenChange

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoginLoading(false)
      return
    }
    onOpenChange?.(false)
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError(null)
    setRegLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: regName, email: regEmail, password: regPassword }),
    })
    const json = await res.json()
    if (!res.ok) {
      setRegError(json.error ?? '회원가입에 실패했습니다.')
      setRegLoading(false)
      return
    }
    const { error: signInError } = await createClient().auth.signInWithPassword({ email: regEmail, password: regPassword })
    if (signInError) {
      setRegError('가입은 완료됐으나 로그인에 실패했습니다. 다시 로그인해 주세요.')
      setRegLoading(false)
      return
    }
    onOpenChange?.(false)
    router.push('/onboarding')
  }

  return (
    <Dialog open={open} onOpenChange={dismissable ? onOpenChange : () => {}}>
      <DialogContent
        className="sm:max-w-sm"
        onPointerDownOutside={dismissable ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={dismissable ? undefined : (e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-blue-600" />
            <DialogTitle className="text-lg">로그인이 필요합니다</DialogTitle>
          </div>
          <DialogDescription>
            {description ?? '이 기능을 사용하려면 로그인이 필요합니다.'}
          </DialogDescription>
        </DialogHeader>

        {/* 탭 */}
        <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            무료 회원가입
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="modal-email">이메일</Label>
              <Input
                id="modal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-password">비밀번호</Label>
              <Input
                id="modal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <Button type="submit" className="w-full mt-1" disabled={loginLoading}>
              {loginLoading ? '로그인 중...' : '로그인'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              <Link href="/find-password" className="hover:underline">비밀번호를 잊으셨나요?</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">이름</Label>
              <Input
                id="reg-name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="홍길동"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">이메일</Label>
              <Input
                id="reg-email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">비밀번호</Label>
              <Input
                id="reg-password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="8자 이상"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {regError && <p className="text-sm text-red-500">{regError}</p>}
            <Button type="submit" className="w-full mt-1" disabled={regLoading}>
              {regLoading ? '가입 중...' : '무료로 시작하기'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              가입 후 사업자 정보를 입력하면 이용할 수 있습니다.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
