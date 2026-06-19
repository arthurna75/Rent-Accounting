'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Building2, User, CreditCard } from 'lucide-react'
import { LoginModal } from '@/components/auth/LoginModal'

const SAMPLE_ROWS = [
  { icon: Building2,  label: '사업자 정보', desc: '상호명, 사업자등록번호, 임대 유형 등' },
  { icon: User,       label: '계정 정보',   desc: '이메일, 권한 관리' },
  { icon: CreditCard, label: '구독 정보',   desc: '구독 플랜 및 만료일 확인' },
]

export function GuestSettingsPrompt() {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const [showAuth, setShowAuth] = useState(false)

  function openLogin() { setAuthTab('login'); setShowAuth(true) }
  function openRegister() { setAuthTab('register'); setShowAuth(true) }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <LoginModal
        open={showAuth}
        onOpenChange={setShowAuth}
        description="설정 페이지를 이용하려면 로그인이 필요합니다."
        defaultTab={authTab}
      />

      <h2 className="text-xl font-semibold text-gray-900">설정</h2>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-8 text-center space-y-4">
          <Settings className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <p className="font-medium text-gray-900">로그인 후 설정을 관리할 수 있습니다</p>
            <p className="text-sm text-gray-500 mt-1">사업자 정보, 계정 및 구독 플랜을 확인하고 변경할 수 있습니다.</p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={openLogin}>로그인하기</Button>
            <Button variant="outline" onClick={openRegister}>무료 회원가입</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {SAMPLE_ROWS.map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="opacity-50">
            <CardContent className="py-4 flex items-center gap-4">
              <Icon className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
