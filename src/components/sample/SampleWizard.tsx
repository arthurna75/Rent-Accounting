import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wand2 } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_WIZARD } from '@/lib/sample-data'
import { cn } from '@/lib/utils'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

export function SampleWizard({ isGuest }: { isGuest: boolean }) {
  const { buildingName, conversionDate, rooms, accounts, loanAmount, totals, journalLines } = SAMPLE_WIZARD
  const totalDebit  = journalLines.filter(l => l.side === '차변').reduce((s, l) => s + l.amount, 0)
  const totalCredit = journalLines.filter(l => l.side === '대변').reduce((s, l) => s + l.amount, 0)

  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />

      <div className="flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-gray-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">복식부기 전환 마법사</h2>
          <p className="text-sm text-gray-500 mt-0.5">다세대주택 호실별 자산·임대현황을 입력하고 개시분개를 자동 생성합니다.</p>
        </div>
      </div>

      {/* 건물 기본 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">건물 기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">건물명</p>
              <p className="font-semibold text-gray-900">{buildingName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">전환기준일</p>
              <p className="font-semibold text-gray-900">{conversionDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 합계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '토지 총액',       value: totals.land,     color: 'text-blue-700',   bg: 'bg-blue-50' },
          { label: '건물 총액',       value: totals.building, color: 'text-indigo-700', bg: 'bg-indigo-50' },
          { label: '임대보증금 총액', value: totals.deposit,  color: 'text-green-700',  bg: 'bg-green-50' },
          { label: '월세 합계(월)',   value: totals.rent,     color: 'text-orange-700', bg: 'bg-orange-50' },
        ].map(c => (
          <Card key={c.label} className={cn('border-0', c.bg)}>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={cn('text-lg font-bold tabular-nums', c.color)}>{fmt(c.value)}원</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 호실 현황 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">호실별 자산 · 임대현황</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">호실</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600">전용면적(㎡)</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600">토지지분율(%)</th>
                  <th className="px-2 py-2 text-right font-medium text-blue-700">토지취득가</th>
                  <th className="px-2 py-2 text-right font-medium text-blue-700">건물취득가</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-l border-gray-200">임차인</th>
                  <th className="px-2 py-2 text-right font-medium text-green-700">보증금</th>
                  <th className="px-2 py-2 text-right font-medium text-green-700">월세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map(r => (
                  <tr key={r.unitNumber} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{r.unitNumber}</td>
                    <td className="px-2 py-2 text-right text-gray-600">{r.exclusiveArea}</td>
                    <td className="px-2 py-2 text-right text-gray-600">{r.landShareRatio}%</td>
                    <td className="px-2 py-2 text-right tabular-nums text-blue-700">{fmt(r.landValue)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-blue-700">{fmt(r.buildingValue)}</td>
                    <td className="px-2 py-2 text-left border-l border-gray-200 text-gray-700">{r.tenantName ?? <span className="text-gray-300">공실</span>}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-green-700">{r.depositAmount > 0 ? fmt(r.depositAmount) : '-'}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-green-700">{r.monthlyRent > 0 ? fmt(r.monthlyRent) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <tr>
                  <td className="px-3 py-2 text-xs text-gray-500" colSpan={3}>합계</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums text-blue-700">{fmt(totals.land)}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums text-blue-700">{fmt(totals.building)}</td>
                  <td className="border-l border-gray-200" />
                  <td className="px-2 py-2 text-right text-xs tabular-nums text-green-700">{fmt(totals.deposit)}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums text-green-700">{fmt(totals.rent)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 계정 매핑 + 균형 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">계정과목 매핑 및 재무상태 균형</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
            {[
              { label: '토지 계정',      value: accounts.land },
              { label: '건물 계정',      value: accounts.building },
              { label: '임대보증금',     value: accounts.deposit },
              { label: '대출금 계정',    value: accounts.loan },
              { label: '대출금 금액',    value: `${fmt(loanAmount)}원` },
              { label: '자본 계정',      value: accounts.capital },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                <p className="font-medium text-gray-800">{f.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-blue-700">자산 {fmt(totals.land + totals.building)}원</span>
            <span className="text-gray-400">=</span>
            <span className="text-green-700">보증금 {fmt(totals.deposit)}원</span>
            <span className="text-gray-400">+</span>
            <span className="text-orange-700">대출금 {fmt(loanAmount)}원</span>
            <span className="text-gray-400">+</span>
            <span className="text-purple-700 font-semibold">자본금 {fmt(totals.land + totals.building - totals.deposit - loanAmount)}원</span>
            <span className="ml-auto text-green-600 font-semibold">✓ 균형</span>
          </div>
        </CardContent>
      </Card>

      {/* 개시분개 미리보기 */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-base">개시분개 (생성 결과)</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">기준일: {conversionDate} · 전표 확정(posted) 저장 완료</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 w-16">구분</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">계정과목</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 w-20">호실</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600 w-36">금액 (원)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {journalLines.map((line, i) => (
                  <tr key={i} className={line.side === '차변' ? 'bg-blue-50/30' : 'bg-red-50/20'}>
                    <td className="px-4 py-2">
                      <span className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded',
                        line.side === '차변' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600',
                      )}>
                        {line.side}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-800">{line.account}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{line.unit ?? ''}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td className="px-4 py-2 text-xs font-bold text-gray-600" colSpan={3}>합계</td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-sm font-bold tabular-nums text-green-700">
                      차변 {fmt(totalDebit)} / 대변 {fmt(totalCredit)} ✓ 균형
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
