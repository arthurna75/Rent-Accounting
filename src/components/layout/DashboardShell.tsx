'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { LandingOverlay } from '@/components/landing/LandingOverlay'
import type { UserRole } from '@/types/database'

interface DashboardShellProps {
  user: { email: string; name: string } | null
  organization: string
  role?: UserRole
  isSampleMode: boolean
  isGuest: boolean
  children: React.ReactNode
}

export function DashboardShell({
  user, organization, role, isSampleMode, isGuest, children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openSidebar  = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* 비로그인 시 마케팅 오버레이 */}
      {isGuest && <LandingOverlay />}
      {/* 모바일 오버레이 (반투명 배경) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 래퍼
          - 모바일: fixed 포지션, 슬라이드 트랜지션
          - 태블릿/데스크탑(md+): relative 인-플로우 */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0 md:inset-auto md:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar
          role={role}
          isSampleMode={isSampleMode}
          isGuest={isGuest}
          onClose={closeSidebar}
        />
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          user={user}
          organization={organization}
          onMenuClick={openSidebar}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
