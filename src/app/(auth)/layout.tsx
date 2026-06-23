import { Building2, CheckCircle2, TrendingDown, Shield, RefreshCw, Wand2, Calculator, BarChart3, BookOpen } from 'lucide-react'

const BENEFITS = [
  {
    icon: TrendingDown,
    title: '연간 기장료 최대 130만원 절감',
    desc: '월 기장 대행(연 180만원) 대신 직접 장부 작성 후 신고만 맡기면 연 50만원 수준으로 가능합니다.',
    highlight: true,
  },
  {
    icon: BarChart3,
    title: '내 자산을 실시간으로 파악',
    desc: '보증금 총액·미수임대료·건물 취득원가·감가상각 누계액을 언제든지 확인할 수 있습니다.',
    highlight: false,
  },
  {
    icon: Shield,
    title: '세무조사 대응력 강화',
    desc: '취득가액·보증금·수선비·대출금 등 세무서 질의에 복식장부로 즉시 근거를 제시합니다.',
    highlight: false,
  },
  {
    icon: RefreshCw,
    title: '세무사 교체 자유로움',
    desc: '내 시스템·내 DB에 데이터가 있으므로 어느 세무사에게도 재무제표를 자유롭게 전달합니다.',
    highlight: false,
  },
]

const FEATURES = [
  { icon: Wand2,      label: '개시분개 자동생성' },
  { icon: Building2,  label: '호실별 자산 관리' },
  { icon: BookOpen,   label: '보증금·월세 관리' },
  { icon: Calculator, label: '감가상각 자동계산' },
  { icon: BarChart3,  label: '간주임대료 계산' },
  { icon: CheckCircle2, label: '재무제표 자동생성' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── 왼쪽: 마케팅 패널 ── */}
      <div className="hidden lg:flex lg:flex-col lg:w-[55%] xl:w-[60%] bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white overflow-y-auto">
        <div className="flex flex-col justify-between min-h-screen px-10 xl:px-16 py-12">

          {/* 브랜드 */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/30 border border-blue-400/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-300" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">임대사업자 복식회계</span>
          </div>

          {/* 히어로 */}
          <div className="space-y-8 my-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-3 py-1 text-xs text-blue-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                복식부기 의무자를 위한 임대관리 솔루션
              </div>
              <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white">
                장부는 내가 직접,<br />
                세금신고만 세무사에게
              </h1>
              <p className="text-blue-200 text-base xl:text-lg leading-relaxed max-w-md">
                5~50호실 임대사업자가 <strong className="text-white">복식장부를 직접 작성</strong>하고
                세무사에게는 <strong className="text-white">종합소득세 신고만 의뢰</strong>하는
                가장 효율적인 방법입니다.
              </p>
            </div>

            {/* 핵심 수치 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '연 130만원', label: '기장료 절감 효과', sub: '신고만 의뢰 시' },
                { value: '5~50호실', label: '최적 사용 규모', sub: '복식부기 의무자' },
                { value: '8가지', label: '핵심 자동화 기능', sub: '결산까지 원스톱' },
              ].map(c => (
                <div key={c.value} className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                  <p className="text-xl xl:text-2xl font-bold text-white">{c.value}</p>
                  <p className="text-xs text-blue-300 mt-0.5 font-medium">{c.label}</p>
                  <p className="text-[10px] text-blue-400/70 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* 비용 비교 카드 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest">비용 비교 예시 (24호실 기준)</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-400/60" />
                    <span className="text-sm text-blue-200">세무사 월 기장 + 신고</span>
                  </div>
                  <span className="text-sm font-semibold text-red-300">연 180만원~</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-400/60" />
                    <span className="text-sm text-blue-200">직접 장부 + 신고만 의뢰</span>
                  </div>
                  <span className="text-sm font-semibold text-green-300">연 50만원~</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">절감 효과</span>
                  <span className="text-base font-extrabold text-yellow-300">연 약 130만원 ↓</span>
                </div>
              </div>
            </div>

            {/* 4가지 장점 */}
            <div className="space-y-3">
              {BENEFITS.map(b => (
                <div
                  key={b.title}
                  className={`flex items-start gap-3 rounded-xl p-3.5 border ${
                    b.highlight
                      ? 'bg-blue-500/15 border-blue-400/30'
                      : 'bg-white/[0.03] border-white/8'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    b.highlight ? 'bg-blue-500/30' : 'bg-white/10'
                  }`}>
                    <b.icon className={`w-4 h-4 ${b.highlight ? 'text-blue-300' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="text-xs text-blue-300/80 mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 핵심 기능 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest">핵심 자동화 기능</p>
              <div className="grid grid-cols-3 gap-2">
                {FEATURES.map(f => (
                  <div key={f.label} className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-2">
                    <f.icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs text-blue-200">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 타겟 안내 */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs text-blue-400/70 leading-relaxed">
              이 프로그램은 <strong className="text-blue-300">5~50호실 개인 임대사업자</strong> 중
              복식부기 의무자이면서 엑셀로 관리하던 분 또는
              세무대리 비용에 부담을 느끼시는 분께 최적화되어 있습니다.
              세무사에게는 재무상태표·손익계산서·시산표·감가상각명세만 전달하면 됩니다.
            </p>
          </div>

        </div>
      </div>

      {/* ── 오른쪽: 로그인 폼 ── */}
      <div className="flex flex-1 flex-col justify-center py-12 px-6 sm:px-10 lg:px-14 xl:px-20 bg-gray-50">
        {/* 모바일 전용 브랜드 */}
        <div className="lg:hidden mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">임대사업자 복식회계</span>
          </div>
          <p className="text-sm text-gray-500">장부는 직접, 세금신고만 세무사에게</p>
        </div>

        <div className="mx-auto w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  )
}
