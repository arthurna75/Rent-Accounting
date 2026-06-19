'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, User, LogIn, UserPlus, ExternalLink } from 'lucide-react'
import { LoginModal } from '@/components/auth/LoginModal'

interface HeaderProps {
  user: { email: string; name: string } | null
  organization: string
}

const QUICK_LINKS = [
  { label: '렌트홈', href: 'https://www.renthome.go.kr/webportal/main/portalMainList.open' },
  { label: '공시가격', href: 'https://www.realtyprice.kr/notice/main/main.do' },
  { label: '토지이용계획', href: 'https://www.eum.go.kr/web/ar/lu/luLandDet.jsp' },
  { label: '홈택스', href: 'https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&menuCd=index3' },
]

export function Header({ user, organization }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const [showAuthModal, setShowAuthModal] = useState(false)

  function openLogin() { setAuthTab('login'); setShowAuthModal(true) }
  function openRegister() { setAuthTab('register'); setShowAuthModal(true) }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 gap-4">
      {/* 왼쪽: 조직명 */}
      <div className="text-sm shrink-0">
        {organization && (
          <span className="font-medium text-gray-900">{organization}</span>
        )}
      </div>

      {/* 가운데: 바로가기 링크 */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {QUICK_LINKS.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-3 h-3" />
            {label}
          </a>
        ))}
      </div>

      {/* 오른쪽: 사용자 컨트롤 */}
      <div className="flex items-center gap-2 shrink-0">
        {user ? (
          <>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4 text-gray-500" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  프로필
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <LoginModal
              open={showAuthModal}
              onOpenChange={setShowAuthModal}
              description="로그인하여 데이터를 저장하고 관리하세요."
              defaultTab={authTab}
            />
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600" onClick={openLogin}>
              <LogIn className="w-4 h-4" />
              로그인
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openRegister}>
              <UserPlus className="w-4 h-4" />
              무료 가입
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
