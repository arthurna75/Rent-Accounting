import { IncomeStatementClient } from './IncomeStatementClient'

export default function IncomeStatementPage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">손익계산서</h2>
        <p className="text-sm text-gray-500 mt-1">일정 기간 동안의 수익과 비용, 영업이익을 나타냅니다.</p>
      </div>
      <IncomeStatementClient currentYear={currentYear} />
    </div>
  )
}
