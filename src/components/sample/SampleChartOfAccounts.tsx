import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_COA } from '@/lib/sample-data'
import { cn } from '@/lib/utils'

type COAItem = typeof SAMPLE_COA[number]

const TYPE_BADGE: Record<string, string> = {
  자산: 'bg-blue-50 text-blue-700',
  부채: 'bg-orange-50 text-orange-700',
  자본: 'bg-purple-50 text-purple-700',
  수익: 'bg-green-50 text-green-700',
  비용: 'bg-red-50 text-red-700',
}

// ── 한 쪽(차변/대변) 계정 목록 ──
function SampleSide({ groups }: { groups: { type: string; items: COAItem[] }[] }) {
  return (
    <div className="divide-y divide-gray-100">
      {groups.map(({ type, items }) => (
        <div key={type}>
          <div className={cn('px-4 py-1.5 text-xs font-semibold flex items-center gap-2', TYPE_BADGE[type])}>
            {type}
            <span className="font-normal text-gray-400 ml-auto">{items.length}개</span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-300">등록된 계정 없음</p>
          ) : (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-50">
                {items.map(c => (
                  <tr key={c.code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2 font-mono text-gray-400 w-12 whitespace-nowrap">{c.code}</td>
                    <td className="px-2 py-2 font-medium text-gray-800">
                      <div className="flex items-center gap-1">
                        {c.name}
                        {c.is_system && <Lock className="w-3 h-3 text-gray-300 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      {c.is_system
                        ? <Badge variant="secondary" className="text-[10px]">시스템</Badge>
                        : <Badge variant="outline" className="text-[10px]">사용자</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

// ── T계정 카드 ──
function TAccountCard({
  title,
  debitLabel, debitGroups,
  creditLabel, creditGroups,
}: {
  title: string
  debitLabel: string
  debitGroups: { type: string; items: COAItem[] }[]
  creditLabel: string
  creditGroups: { type: string; items: COAItem[] }[]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-1">
        <div className="mx-4 mb-4 rounded-lg border border-gray-200 overflow-hidden">
          {/* 헤더 */}
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="px-4 py-2 bg-blue-50 text-sm font-bold text-blue-700">
              차변 (Debit) · {debitLabel}
            </div>
            <div className="px-4 py-2 bg-red-50 text-sm font-bold text-red-700">
              대변 (Credit) · {creditLabel}
            </div>
          </div>
          {/* 양쪽 내용 */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-gray-100 border-t border-gray-100">
            <SampleSide groups={debitGroups} />
            <SampleSide groups={creditGroups} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 메인 컴포넌트 ──
export function SampleChartOfAccounts({ isGuest }: { isGuest: boolean }) {
  const byType = (type: string) => SAMPLE_COA.filter(c => c.account_type === type)

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />

      <div>
        <h2 className="text-xl font-semibold text-gray-900">계정과목</h2>
        <p className="text-sm text-gray-500 mt-1">
          재무상태표(자산·부채·자본)와 손익계산서(비용·수익) 항목을 T계정 형식으로 표시합니다.
        </p>
      </div>

      {/* 재무상태표 */}
      <TAccountCard
        title="재무상태표 (대차대조표)"
        debitLabel="자산"
        debitGroups={[{ type: '자산', items: byType('자산') }]}
        creditLabel="부채 / 자본"
        creditGroups={[
          { type: '부채', items: byType('부채') },
          { type: '자본', items: byType('자본') },
        ]}
      />

      {/* 손익계산서 */}
      <TAccountCard
        title="손익계산서"
        debitLabel="비용"
        debitGroups={[{ type: '비용', items: byType('비용') }]}
        creditLabel="수익"
        creditGroups={[{ type: '수익', items: byType('수익') }]}
      />
    </div>
  )
}
