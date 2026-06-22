'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'
import {
  LayoutDashboard, Building2, FileText, BookOpen,
  BarChart3, Settings, Calculator, Receipt, List, X, TrendingUp, Store, Wand2,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: '대시보드',    href: '/',                             icon: LayoutDashboard, roles: ['owner','accountant','viewer'] },
  { label: '부동산',      href: '/properties',                   icon: Building2,       roles: ['owner','accountant','viewer'] },
  { label: '임대차계약',  href: '/contracts',                    icon: FileText,        roles: ['owner','accountant','viewer'] },
  { label: '전환마법사',   href: '/accounting/wizard',            icon: Wand2,           roles: ['owner','accountant'] },
  { label: '분개장',      href: '/accounting/journal',           icon: BookOpen,        roles: ['owner','accountant'] },
  { label: '계정과목',    href: '/accounting/chart-of-accounts', icon: List,            roles: ['owner','accountant'] },
  { label: '거래처',      href: '/accounting/vendors',           icon: Store,           roles: ['owner','accountant'] },
  { label: '감가상각',    href: '/accounting/depreciation',      icon: Calculator,      roles: ['owner','accountant'] },
  { label: '간주임대료',  href: '/accounting/deemed-rental',     icon: Receipt,         roles: ['owner','accountant'] },
  { label: '재무상태표',  href: '/reports/balance-sheet',        icon: BarChart3,    roles: ['owner','accountant','viewer'] },
  { label: '손익계산서',  href: '/reports/income-statement',    icon: BarChart3,    roles: ['owner','accountant','viewer'] },
  { label: '손익통계',    href: '/reports/pl-stats',            icon: TrendingUp,   roles: ['owner','accountant','viewer'] },
  { label: '시산표',      href: '/reports/trial-balance',       icon: BarChart3,    roles: ['owner','accountant'] },
  { label: '설정',        href: '/settings',                    icon: Settings,     roles: ['owner'] },
]

interface SidebarProps {
  role?: UserRole
  isSampleMode?: boolean
  isGuest?: boolean
  onClose?: () => void
}

export function Sidebar({ role = 'viewer', isSampleMode = false, isGuest = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const items = isGuest ? NAV_ITEMS : NAV_ITEMS.filter(i => i.roles.includes(role))

  return (
    <aside className="flex flex-col w-56 h-full bg-white border-r border-gray-200">
      {/* 예시 모드 배너 */}
      {isSampleMode && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-400 py-1.5 text-xs font-bold text-amber-900 tracking-wide shrink-0">
          <span>★</span>
          <span>예시 데이터 보는 중</span>
          <span>★</span>
        </div>
      )}

      {/* 로고 + 모바일 닫기 버튼 */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
        <h1 className="text-lg font-bold text-blue-700 leading-tight">
          임대사업<br />
          <span className="text-sm font-medium text-gray-500">복식회계</span>
        </h1>
        {/* 모바일에서만 표시되는 닫기 버튼 */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
