'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight, Building2, FileText, Wand2, BookOpen, Store,
  Calculator, Receipt, BarChart3, AlertTriangle, CheckCircle2,
  Info, ArrowRight, TrendingUp, List,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'how-to-use' | 'income-tax'

// ────────────────────────────────────────
// 업무 플로우 데이터
// ────────────────────────────────────────
const FLOW_STEPS = [
  {
    num: 1,
    title: '건물·호실 등록',
    menu: '부동산',
    icon: Building2,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    desc: '건물명, 호실번호, 토지/건물 취득가, 전용면적, 취득일자를 등록합니다.',
    notes: [
      '토지와 건물 취득가는 분리 입력 (감가상각은 건물만 적용)',
      '취득가 불명확 시 기준시가 또는 감정평가 금액 사용',
      '호실이 많을 경우 전환마법사에서 일괄 등록 가능',
    ],
  },
  {
    num: 2,
    title: '임대차계약 등록',
    menu: '임대차계약 / 전환마법사',
    icon: FileText,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    desc: '임차인 정보, 보증금, 월세, 계약기간을 등록합니다. 호실이 3개 이상이면 전환마법사를 권장합니다.',
    notes: [
      '주민번호는 앞 6자리 + 뒷 1자리만 저장 (개인정보 보호)',
      '전세는 월세 0원, 반전세는 보증금+월세 모두 입력',
      '계약 갱신 시 기존 계약 수정보다 신규 계약 등록 권장',
    ],
    sub: '다수: 전환마법사',
  },
  {
    num: 3,
    title: '개시분개 생성',
    menu: '전환마법사 → 분개장',
    icon: Wand2,
    color: 'bg-violet-100 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
    desc: '복식부기 전환 시점의 재무상태를 분개로 기록합니다. 차변(자산) = 대변(부채+자본) 균형을 확인합니다.',
    notes: [
      '전환마법사 Step 3에서 자동 생성 (권장)',
      '수동 입력 시: 차변 토지+건물, 대변 보증금+대출금+자본금',
      '자본금 = 총자산 - 총부채 (균형이 맞아야 저장됨)',
    ],
  },
  {
    num: 4,
    title: '거래처 등록',
    menu: '거래처',
    icon: Store,
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
    desc: '금융기관, 보험사, 공공기관, 수선업체 등 거래 상대방을 등록합니다.',
    notes: [
      '임차인은 임대차계약 등록 시 자동 처리 (별도 등록 불필요)',
      '자주 쓰는 거래처 미리 등록하면 전표 입력 속도 향상',
    ],
  },
  {
    num: 5,
    title: '일상 전표 처리',
    menu: '분개장',
    icon: BookOpen,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    desc: '월세 수입, 수선비·보험료·대출이자 등 발생 시마다 전표를 작성합니다.',
    notes: [
      '수입: (차) 보통예금 / (대) 임대료수입',
      '이자: (차) 이자비용 / (대) 보통예금',
      '수선: 자본적 지출이면 건물 계정, 수익적 지출이면 수선비',
      '전표 저장 후 "확정" 처리해야 재무제표에 반영됨',
    ],
  },
  {
    num: 6,
    title: '세무마감 처리',
    menu: '감가상각 · 간주임대료',
    icon: Calculator,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    desc: '연말(보통 12월 31일) 기준으로 감가상각비와 간주임대료를 계산·전표 처리합니다.',
    notes: [
      '감가상각: 건물 취득가 ÷ 내용연수(40년) = 연간 감가상각비',
      '간주임대료: 3주택 이상이고 보증금 합계 3억 초과 시 발생',
      '계산 후 반드시 "전표 생성" 버튼으로 분개장에 반영',
      '당해연도 귀속 분만 인식 (기간 안분 주의)',
    ],
    badge: '연 1회',
  },
  {
    num: 7,
    title: '재무제표 확인',
    menu: '재무상태표 · 손익계산서',
    icon: BarChart3,
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    desc: '재무상태표(자산=부채+자본)와 손익계산서(수익-비용=이익)로 경영성과를 확인합니다.',
    notes: [
      '시산표로 차변·대변 합계 일치 여부를 먼저 검증',
      '손익통계: 연도별·호실별 수익성 비교 분석',
      '재무상태표 자산·부채가 일치하지 않으면 전표 누락 의심',
    ],
  },
]

// ────────────────────────────────────────
// 종합소득세 탭 데이터
// ────────────────────────────────────────
const EXPENSES = [
  { item: '감가상각비', detail: '건물 취득가 ÷ 내용연수(40년). 토지는 감가상각 불가.', important: true },
  { item: '수선비', detail: '소모적 수선(도배·장판 등). 자본적 지출(증축·엘리베이터 등)은 자산 처리 후 감가상각.', important: true },
  { item: '화재·건물보험료', detail: '임대 건물에 대한 화재보험, 종합보험 납입액 전액.', important: false },
  { item: '재산세 · 종합부동산세', detail: '임대용 부동산에 대한 재산세. 종부세는 필요경비 산입 가능.', important: false },
  { item: '대출이자', detail: '부동산 취득·운용 목적 대출의 이자. 원금 상환액은 제외.', important: true },
  { item: '관리비(공용부분)', detail: '공용 전기·수도·청소·엘리베이터 유지비 등 건물주 부담분.', important: false },
  { item: '임대광고비', detail: '부동산 중개 플랫폼, 현수막 등 공실 임차인 모집 비용.', important: false },
  { item: '중개수수료', detail: '계약 체결 시 공인중개사에게 지급한 중개보수.', important: false },
  { item: '기장료', detail: '세무사·공인회계사에게 지급한 장부작성·신고대리 수수료.', important: false },
  { item: '간주임대료 차감', detail: '3주택 이상 + 보증금 합계 3억 초과 시, 보증금 운용 이자 상당액 수입 산입 후 실제 이자비용 차감 가능.', important: true },
]

// ────────────────────────────────────────
// 메인 페이지
// ────────────────────────────────────────
export default function HelpPage() {
  const [tab, setTab] = useState<Tab>('how-to-use')

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">사용방법</h2>
        <p className="text-sm text-gray-500 mt-1">
          임대사업 복식회계 프로그램 사용 안내 및 세무 정보
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-0 border-b border-gray-200">
        {([
          { id: 'how-to-use' as Tab, label: '임대사업 복식회계 사용법' },
          { id: 'income-tax'  as Tab, label: '종합소득세 안내' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'how-to-use' && <HowToUseTab />}
      {tab === 'income-tax'  && <IncomeTaxTab />}
    </div>
  )
}

// ────────────────────────────────────────
// 탭 1: 임대사업 복식회계 사용법
// ────────────────────────────────────────
function HowToUseTab() {
  const [openStep, setOpenStep] = useState<number | null>(null)

  return (
    <div className="space-y-6">

      {/* 업무 플로우 다이어그램 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">업무 플로우</CardTitle>
          <p className="text-xs text-gray-400">단계를 클릭하면 상세 설명을 확인할 수 있습니다.</p>
        </CardHeader>
        <CardContent>
          {/* 데스크탑: 가로 흐름 */}
          <div className="hidden md:flex items-start gap-1 overflow-x-auto pb-3 -mx-1">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.num} className="flex items-start shrink-0">
                <button
                  onClick={() => setOpenStep(openStep === step.num ? null : step.num)}
                  className={cn(
                    'w-28 flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 text-center transition-all hover:shadow-md',
                    step.color,
                    openStep === step.num ? 'shadow-md ring-2 ring-offset-1 ring-blue-400' : '',
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center">
                    <step.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">{step.num}. {step.title}</span>
                  {step.badge && (
                    <span className="text-[9px] bg-white/70 px-1.5 py-0.5 rounded-full font-medium">{step.badge}</span>
                  )}
                  {step.sub && (
                    <span className="text-[9px] text-current/70 leading-tight">{step.sub}</span>
                  )}
                </button>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="flex items-center self-center mx-0.5 mt-0">
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 모바일: 세로 흐름 */}
          <div className="md:hidden space-y-2">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.num}>
                <button
                  onClick={() => setOpenStep(openStep === step.num ? null : step.num)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                    step.color,
                    openStep === step.num ? 'shadow ring-1 ring-blue-400' : '',
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center shrink-0">
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold">{step.num}. {step.title}</span>
                    {step.sub && <span className="ml-2 text-xs opacity-70">({step.sub})</span>}
                  </div>
                  {step.badge && <Badge variant="outline" className="text-[10px] shrink-0">{step.badge}</Badge>}
                </button>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <div className="w-0.5 h-4 bg-gray-200" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 단계 상세 설명 */}
      {openStep !== null && (() => {
        const step = FLOW_STEPS.find(s => s.num === openStep)!
        return (
          <Card className={cn('border-2', step.color)}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', step.color)}>
                  <step.icon className="w-4 h-4" />
                </div>
                <CardTitle className="text-base">{step.num}단계: {step.title}</CardTitle>
                <Badge variant="outline" className={cn('ml-auto text-xs', step.color)}>{step.menu}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">{step.desc}</p>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">주의사항 · 작성 방법</p>
                <ul className="space-y-1.5">
                  {step.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* 전체 단계별 메뉴얼 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <List className="w-4 h-4 text-gray-400" />
          단계별 상세 메뉴얼
        </h3>
        {FLOW_STEPS.map(step => (
          <Card key={step.num} className="overflow-hidden">
            <div className={cn('flex items-center gap-3 px-4 py-3 border-b', step.color.replace('border-', 'border-b-').split(' ')[0], 'bg-opacity-30')}>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', step.dot)}>
                {step.num}
              </div>
              <step.icon className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-sm text-gray-800 flex-1">{step.title}</span>
              <span className="text-xs text-gray-400 font-mono">{step.menu}</span>
              {step.badge && <Badge variant="outline" className="text-[10px]">{step.badge}</Badge>}
            </div>
            <CardContent className="py-3 px-4">
              <p className="text-sm text-gray-600 mb-2">{step.desc}</p>
              <ul className="space-y-1">
                {step.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-gray-300 mt-0.5 shrink-0">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 전표 작성 가이드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            주요 거래 분개 예시
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-36">거래 유형</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-700">차변 (Dr.)</th>
                  <th className="px-3 py-2 text-left font-medium text-red-700">대변 (Cr.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {[
                  ['월세 수입 입금',        '보통예금',                        '임대료수입'],
                  ['보증금 수령',           '보통예금',                        '임대보증금'],
                  ['보증금 반환',           '임대보증금',                      '보통예금'],
                  ['대출이자 납부',         '이자비용',                        '보통예금'],
                  ['대출 원금 상환',        '장기차입금',                      '보통예금'],
                  ['수선비 지출',           '수선비',                          '보통예금'],
                  ['화재보험료 납부',       '보험료',                          '보통예금'],
                  ['재산세 납부',           '세금과공과',                      '보통예금'],
                  ['감가상각비 계상 (연말)', '감가상각비',                      '건물감가상각누계액'],
                  ['간주임대료 계상 (연말)', '간주임대료비용(보증금운용이자)',   '간주임대료수입'],
                ].map(([type, dr, cr]) => (
                  <tr key={type} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-700">{type}</td>
                    <td className="px-3 py-2 text-blue-700">{dr}</td>
                    <td className="px-3 py-2 text-red-700">{cr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            전표 저장 후 반드시 <strong className="mx-0.5">확정</strong> 처리해야 재무상태표·손익계산서에 반영됩니다.
          </div>
        </CardContent>
      </Card>

      {/* 전체 주의사항 */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            공통 주의사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              '건물과 토지의 취득가는 반드시 분리하여 입력하세요. 토지는 감가상각 대상이 아닙니다.',
              '모든 현금 수수는 "보통예금" 계정으로 처리하고, 실제 통장 잔액과 월 1회 이상 대사(대조)하세요.',
              '자본적 지출(건물 가치 증가)은 수선비가 아닌 건물 계정으로 처리 후 감가상각합니다.',
              '전표는 저장 단계에서 "임시저장" 상태이며, 확정 버튼을 눌러야 재무제표에 반영됩니다.',
              '연말 감가상각비와 간주임대료는 12월 31일 자로 계산·전표 생성 후 확정하세요.',
              '세무 신고 전 시산표를 반드시 출력하여 차변·대변 합계가 일치하는지 검증하세요.',
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="font-bold text-amber-500 shrink-0 mt-0.5">{i + 1}.</span>
                {note}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────
// 탭 2: 종합소득세 안내
// ────────────────────────────────────────
function IncomeTaxTab() {
  return (
    <div className="space-y-5">

      {/* 신고 개요 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">종합소득세 신고 개요</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <tbody className="divide-y divide-gray-100">
                {[
                  ['신고 대상', '부동산 임대소득이 발생한 개인 (법인 제외)'],
                  ['신고 기간', '매년 5월 1일 ~ 5월 31일'],
                  ['성실신고확인대상자', '직전연도 수입금액 기준 초과 사업자 → 6월 30일까지'],
                  ['신고 방법', '국세청 홈택스(hometax.go.kr) 전자신고 또는 세무서 방문'],
                  ['납부 방법', '신고 후 홈택스 고지서 납부 / 가상계좌 납부 / 자동이체'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="py-2.5 pr-4 text-sm font-medium text-gray-500 w-44 shrink-0 align-top">{label}</td>
                    <td className="py-2.5 text-sm text-gray-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 복식부기 의무자 기준 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            복식부기 의무자 기준 (2024년 귀속 기준)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px] border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">장부 종류</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">적용 기준 (부동산임대업)</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">세액 혜택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-blue-50/40">
                  <td className="px-4 py-3 font-semibold text-blue-800">복식부기 (의무)</td>
                  <td className="px-4 py-3 text-gray-700">직전연도 수입금액 <strong>7,500만원 이상</strong></td>
                  <td className="px-4 py-3 text-gray-600">무기장 가산세 20% 면제</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-700">간편장부 (선택)</td>
                  <td className="px-4 py-3 text-gray-700">직전연도 수입금액 <strong>7,500만원 미만</strong></td>
                  <td className="px-4 py-3 text-gray-600">복식부기 선택 시 세액공제 최대 100만원</td>
                </tr>
                <tr className="bg-red-50/30">
                  <td className="px-4 py-3 font-semibold text-red-700">무기장 (불이익)</td>
                  <td className="px-4 py-3 text-gray-700">장부 미작성</td>
                  <td className="px-4 py-3 text-red-700">산출세액의 20% 가산세 부과</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-2.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>수입금액 기준은 <strong>임대료 + 관리비</strong> 합산입니다. 보증금 수령액은 수입에 포함되지 않습니다.</span>
          </div>
        </CardContent>
      </Card>

      {/* 주택 임대 특례 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">주택 임대소득 분리과세 특례</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px] border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">구분</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">분리과세 (14%)</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">종합과세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2.5 text-gray-600 font-medium">적용 조건</td>
                  <td className="px-4 py-2.5 text-gray-700">연간 주택 임대수입 2,000만원 이하</td>
                  <td className="px-4 py-2.5 text-gray-700">2,000만원 초과 또는 선택</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-gray-600 font-medium">필요경비율</td>
                  <td className="px-4 py-2.5 text-gray-700">50% (등록임대사업자 60%)</td>
                  <td className="px-4 py-2.5 text-gray-700">실제 경비 (복식부기 기준)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-gray-600 font-medium">기본공제</td>
                  <td className="px-4 py-2.5 text-gray-700">400만원 (등록임대사업자 200만원 추가)</td>
                  <td className="px-4 py-2.5 text-gray-700">종합소득공제 적용</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            * 2024년 귀속 기준. 등록임대사업자: 지자체 + 세무서 모두 등록된 경우에 한함.
          </p>
        </CardContent>
      </Card>

      {/* 간주임대료 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">간주임대료 과세 기준</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                title: '적용 대상',
                icon: AlertTriangle,
                color: 'text-orange-600',
                bg: 'bg-orange-50 border-orange-200',
                items: [
                  '3주택 이상 소유자',
                  '보증금 합계 3억원 초과',
                  '비사업용 토지·건물 임대',
                ],
              },
              {
                title: '계산 방법',
                icon: Calculator,
                color: 'text-blue-600',
                bg: 'bg-blue-50 border-blue-200',
                items: [
                  '(보증금 합계 - 3억) × 60%',
                  '× 정기예금이자율(연 2.9%)',
                  '= 연간 간주임대료 수입',
                ],
              },
              {
                title: '차감 경비',
                icon: Receipt,
                color: 'text-green-600',
                bg: 'bg-green-50 border-green-200',
                items: [
                  '실제 지급한 금융이자',
                  '임대보증금 관련 이자만 해당',
                  '간주임대료 수입 한도 내 차감',
                ],
              },
            ].map(c => (
              <div key={c.title} className={cn('rounded-lg border p-3.5', c.bg)}>
                <div className={cn('flex items-center gap-1.5 font-semibold text-sm mb-2', c.color)}>
                  <c.icon className="w-3.5 h-3.5" />
                  {c.title}
                </div>
                <ul className="space-y-1">
                  {c.items.map(item => (
                    <li key={item} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="text-gray-300 mt-0.5">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>이 프로그램의 <strong>간주임대료 메뉴</strong>에서 자동 계산 후 전표를 생성합니다. 연말(12월 31일 기준) 처리를 권장합니다.</span>
          </div>
        </CardContent>
      </Card>

      {/* 필요경비 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">임대사업 주요 필요경비</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-36">경비 항목</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600">설명 및 주의사항</th>
                  <th className="px-3 py-2.5 text-center font-medium text-gray-600 w-16">중요도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {EXPENSES.map(e => (
                  <tr key={e.item} className={e.important ? 'bg-blue-50/20' : ''}>
                    <td className="px-3 py-2.5 font-medium text-gray-800 align-top">{e.item}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs leading-relaxed">{e.detail}</td>
                    <td className="px-3 py-2.5 text-center">
                      {e.important
                        ? <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">핵심</Badge>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 신고 절차 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            종합소득세 신고 절차 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              { step: '연말 마감', desc: '12월 31일 기준으로 감가상각비·간주임대료 전표 처리 후 확정', menu: '감가상각 / 간주임대료' },
              { step: '시산표 검증', desc: '차변·대변 합계 일치 확인. 불일치 시 전표 누락·오류 점검', menu: '시산표' },
              { step: '재무제표 출력', desc: '재무상태표·손익계산서 확인 후 신고 자료로 활용', menu: '재무상태표 / 손익계산서' },
              { step: '홈택스 신고', desc: '5월 1일 ~ 31일 홈택스에서 종합소득세 신고서 작성·제출', menu: '국세청 홈택스' },
              { step: '세금 납부', desc: '신고 후 납부서 확인 및 5월 31일까지 납부 (분납 가능)', menu: '' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800">{item.step}</span>
                    {item.menu && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{item.menu}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>세무 신고는 공인세무사에게 위임하는 것을 권장합니다. 이 프로그램은 장부 작성 도구이며, 세무 판단의 책임은 사용자에게 있습니다.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
