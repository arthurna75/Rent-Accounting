import { Card, CardContent } from '@/components/ui/card'
import { Store } from 'lucide-react'
import { SampleBanner } from './SampleBanner'
import { SAMPLE_VENDORS } from '@/lib/sample-data'

export function SampleVendors({ isGuest }: { isGuest: boolean }) {
  return (
    <div className="space-y-5">
      <SampleBanner isGuest={isGuest} />

      <div className="flex items-center gap-2">
        <Store className="w-5 h-5 text-gray-500" />
        <h2 className="text-xl font-semibold text-gray-900">거래처 관리</h2>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">거래처명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">사업자번호</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SAMPLE_VENDORS.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-4 py-3 text-gray-600">{v.business_number ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.memo ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
