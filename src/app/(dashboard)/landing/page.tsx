import Link from 'next/link'
import {
  Building2, TrendingDown, BarChart3, Shield, RefreshCw,
  CheckCircle2, ArrowRight, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const BENEFITS = [
  {
    icon: TrendingDown,
    title: '기장료 연 최대 130만원 절감',
    desc: '월 기장 대행(연 180만원) 대신 직접 장부 작성 후 신고만 맡기면 연 50만원 수준으로 해결됩니다.',
  },
  {
    icon: BarChart3,
    title: '자산현황 실시간 파악',
    desc: '보증금 총액·미수임대료·건물 취득원가·감가상각 누계액을 언제든지 직접 확인할 수 있습니다.',
  },
  {
    icon: Shield,
    title: '세무조사 대응력 강화',
    desc: '취득가액·보증금·수선비·대출금 등 세무서 질의에 복식장부로 즉시 근거를 제시합니다.',
  },
  {
    icon: RefreshCw,
    title: '세무사 교체 자유로움',
    desc: '내 시스템·내 DB에 데이터가 있어 어느 세무사에게도 재무제표를 자유롭게 전달합니다.',
  },
]

const FEATURES = [
  '개시분개 자동생성', '호실별 자산관리', '보증금·월세 관리',
  '감가상각 자동계산', '간주임대료 계산', '재무제표 자동생성',
]

const STEPS = [
  { num: 1, label: '부동산·호실 등록', desc: '건물과 호실을 입력해 자산 관리 기반을 만듭니다.', href: '/properties' },
  { num: 2, label: '임대계약 등록', desc: '임차인별 보증금·월세·계약기간을 기록합니다.', href: '/contracts' },
  { num: 3, label: '전환마법사 실행', desc: '기존 데이터를 복식부기 개시분개로 자동 전환합니다.', href: '/accounting/wizard' },
  { num: 4, label: '분개장 관리', desc: '월세 수입, 수선비 등 일상 거래를 분개 처리합니다.', href: '/accounting/journal' },
  { num: 5, label: '재무제표 확인', desc: '재무상태표·손익계산서를 실시간으로 조회합니다.', href: '/reports/balance-sheet' },
]

export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-2">

      {/* 헤드라인 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 via-blue-950 to-blue-900 text-white px-6 py-8 md:px-10 md:py-10 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/30 border border-blue-400/30 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-300" />
          </div>
          <span className="text-sm font-semibold text-blue-300 tracking-wide">임대사업자 복식회계</span>
          <span className="text-[10px] bg-blue-500/30 border border-blue-400/30 text-blue-300 px-2 py-0.5 rounded-full font-medium">
            5~50호실 복식부기 의무자
          </span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">
            장부는 내가 직접,<br />
            세금신고만 세무사에게
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed mt-2 max-w-lg">
            개인 임대사업자가 <strong className="text-white">복식장부를 직접 작성</strong>하고
            세무사에게는 <strong className="text-white">종합소득세 신고만 의뢰</strong>하는
            가장 현실적인 방법입니다.
          </p>
        </div>

        {/* 비용 비교 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest mb-3">
            비용 비교 예시 (24호실 기준)
          </p>
          <div className="grid grid-cols-3 gap-2 items-center text-center">
            <div className="space-y-0.5">
              <p className="text-[11px] text-blue-400">세무사 월 기장 + 신고</p>
              <p className="text-lg font-bold text-red-300">연 180만원~</p>
            </div>
            <div className="flex flex-col items-center">
              <ArrowRight className="w-5 h-5 text-yellow-400" />
              <span className="text-[10px] text-yellow-300 font-bold">절감</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-blue-400">직접 장부 + 신고만 의뢰</p>
              <p className="text-lg font-bold text-green-300">연 50만원~</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 text-center">
            <span className="text-xl font-extrabold text-yellow-300">연 약 130만원 절감 ↓</span>
          </div>
        </div>

        {/* 핵심 기능 */}
        <div className="flex flex-wrap gap-2">
          {FEATURES.map(f => (
            <span
              key={f}
              className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-blue-200"
            >
              <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* 도입 혜택 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700">도입 혜택</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BENEFITS.map(b => (
            <Card key={b.title}>
              <CardContent className="p-4 flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <b.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{b.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 업무 흐름 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700">업무 흐름 (5단계)</h2>
        <div className="space-y-2">
          {STEPS.map(s => (
            <Link key={s.num} href={s.href}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {s.num}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{s.label}</p>
                  <p className="text-xs text-gray-500 truncate">{s.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 상세 가이드 링크 */}
      <div className="flex justify-center pb-4">
        <Link href="/help">
          <Button variant="outline" className="gap-2">
            <BookOpen className="w-4 h-4" />
            상세 사용방법 보기
          </Button>
        </Link>
      </div>

    </div>
  )
}
