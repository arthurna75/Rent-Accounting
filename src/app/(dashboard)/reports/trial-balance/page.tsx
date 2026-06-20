import { createClient } from '@/lib/supabase/server'
import { getTrialBalance } from '@/lib/accounting/journal-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW } from '@/lib/utils/format'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { SampleTrialBalance } from '@/components/sample/SampleReports'
import { PrintButton } from '@/components/ui/PrintButton'

interface PageProps {
  searchParams: Promise<{ year?: string }>
}

const ACCOUNT_TYPE_ORDER = ['자산', '부채', '자본', '수익', '비용']

export default async function TrialBalancePage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const selectedYear = params.year ? parseInt(params.year, 10) : currentYear

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <SampleTrialBalance isGuest />

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile!.organization_id

  // 회계연도 조회
  const { data: fiscalYear } = await supabase
    .from('fiscal_years')
    .select('id, year')
    .eq('organization_id', organizationId)
    .eq('year', selectedYear)
    .single()

  // 연도 선택 범위: 현재연도 ±2년
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">시산표</h2>
          <p className="text-sm text-gray-500 mt-1">회계연도별 계정과목의 차변·대변 합계와 잔액을 확인합니다.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PrintButton className="print:hidden" />
          <form method="GET">
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
              회계연도
            </label>
            <select
              id="year-select"
              name="year"
              defaultValue={String(selectedYear)}
              onChange={undefined}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}년
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              조회
            </button>
          </div>
        </form>
        </div>
      </div>

      {!fiscalYear ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-400">
            선택한 연도({selectedYear}년)의 회계연도가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <TrialBalanceContent
          supabase={supabase}
          organizationId={organizationId}
          fiscalYearId={fiscalYear.id}
          selectedYear={selectedYear}
        />
      )}
    </div>
  )
}

// 내부 비동기 컴포넌트 — 서버 컴포넌트 내에서 직접 await 사용
async function TrialBalanceContent({
  supabase,
  organizationId,
  fiscalYearId,
  selectedYear,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
  fiscalYearId: string
  selectedYear: number
}) {
  let rows: Awaited<ReturnType<typeof getTrialBalance>> = []
  let fetchError: string | null = null

  try {
    rows = await getTrialBalance(supabase, organizationId, fiscalYearId)
  } catch (e) {
    fetchError = e instanceof Error ? e.message : '조회 중 오류가 발생했습니다.'
  }

  if (fetchError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-red-500">
          {fetchError}
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return <SampleTrialBalance isGuest={false} />
  }

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  // 계정유형별 그룹핑
  const grouped: Record<string, typeof rows> = {}
  for (const row of rows) {
    if (!grouped[row.account_type]) grouped[row.account_type] = []
    grouped[row.account_type].push(row)
  }

  return (
    <>
      {/* 균형 요약 카드 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">총 차변</p>
                <p className="text-base font-semibold text-blue-600">{formatKRW(totalDebit)}</p>
              </div>
              <div className="text-gray-300 text-lg">=</div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">총 대변</p>
                <p className="text-base font-semibold text-orange-500">{formatKRW(totalCredit)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">균형 (차변 = 대변)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-600">
                    불균형 (차이: {formatKRW(Math.abs(totalDebit - totalCredit))})
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 계정유형별 테이블 */}
      {ACCOUNT_TYPE_ORDER.filter((t) => grouped[t]?.length).map((type) => {
        const typeRows = grouped[type]
        const typeDebit = typeRows.reduce((s, r) => s + r.debit, 0)
        const typeCredit = typeRows.reduce((s, r) => s + r.credit, 0)
        const typeBalance = typeDebit - typeCredit

        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{type}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">계정코드</TableHead>
                    <TableHead>계정명</TableHead>
                    <TableHead className="text-center w-20">계정유형</TableHead>
                    <TableHead className="text-right">차변합계</TableHead>
                    <TableHead className="text-right">대변합계</TableHead>
                    <TableHead className="text-right">잔액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeRows.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="font-mono text-sm">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-center text-sm text-gray-500">{row.account_type}</TableCell>
                      <TableCell className="text-right">
                        {row.debit > 0 ? (
                          <span className="text-gray-700">{formatKRW(row.debit)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.credit > 0 ? (
                          <span className="text-gray-700">{formatKRW(row.credit)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.balance > 0 ? (
                          <span className="text-blue-600">{formatKRW(row.balance)}</span>
                        ) : row.balance < 0 ? (
                          <span className="text-red-500">{formatKRW(Math.abs(row.balance))}</span>
                        ) : (
                          <span className="text-gray-400">0원</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* 소계 행 */}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={3} className="text-sm text-gray-600">
                      {type} 소계
                    </TableCell>
                    <TableCell className="text-right text-sm text-blue-700">
                      {formatKRW(typeDebit)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-orange-600">
                      {formatKRW(typeCredit)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {typeBalance > 0 ? (
                        <span className="text-blue-700">{formatKRW(typeBalance)}</span>
                      ) : typeBalance < 0 ? (
                        <span className="text-red-600">{formatKRW(Math.abs(typeBalance))}</span>
                      ) : (
                        <span className="text-gray-400">0원</span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}

      {/* 합계 행 */}
      <Card className={isBalanced ? 'border-green-200' : 'border-red-200'}>
        <CardContent className="py-4">
          <Table>
            <TableBody>
              <TableRow className="font-bold text-base">
                <TableCell colSpan={3}>합계</TableCell>
                <TableCell className="text-right text-blue-700">{formatKRW(totalDebit)}</TableCell>
                <TableCell className="text-right text-orange-600">{formatKRW(totalCredit)}</TableCell>
                <TableCell className="text-right">
                  {isBalanced ? (
                    <span className="text-green-600 flex items-center justify-end gap-1">
                      <CheckCircle2 className="h-4 w-4" /> 균형
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center justify-end gap-1">
                      <AlertCircle className="h-4 w-4" /> 불균형
                    </span>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
