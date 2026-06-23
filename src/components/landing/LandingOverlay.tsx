'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2, TrendingDown, BarChart3, Shield, RefreshCw,
  X, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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

export function LandingOverlay() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 이번 세션에 이미 닫은 경우엔 다시 표시하지 않음
    if (!sessionStorage.getItem('landing_dismissed')) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem('landing_dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white">

        {/* 닫기 */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        <div className="px-7 py-8 md:px-10 md:py-10 space-y-7">

          {/* 브랜드 + 헤드라인 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/30 border border-blue-400/30 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-300" />
              </div>
              <span className="text-sm font-semibold text-blue-300 tracking-wide">임대사업자 복식회계</span>
              <span className="ml-2 text-[10px] bg-blue-500/30 border border-blue-400/30 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                5~50호실 복식부기 의무자
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">
              장부는 내가 직접,<br />
              세금신고만 세무사에게
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed max-w-lg">
              개인 임대사업자가 <strong className="text-white">복식장부를 직접 작성</strong>하고
              세무사에게는 <strong className="text-white">종합소득세 신고만 의뢰</strong>하는
              가장 현실적인 방법입니다.
            </p>
          </div>

          {/* 비용 비교 카드 */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest mb-4">
              비용 비교 예시 (24호실 기준)
            </p>
            <div className="grid grid-cols-3 gap-3 items-center text-center">
              <div className="space-y-1">
                <p className="text-[11px] text-blue-400">세무사 월 기장 + 신고</p>
                <p className="text-xl font-bold text-red-300">연 180만원~</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <ArrowRight className="w-5 h-5 text-yellow-400" />
                <span className="text-[10px] text-yellow-300 font-bold">절감</span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-blue-400">직접 장부 + 신고만 의뢰</p>
                <p className="text-xl font-bold text-green-300">연 50만원~</p>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-white/10 text-center">
              <span className="text-2xl font-extrabold text-yellow-300">연 약 130만원 절감 ↓</span>
            </div>
          </div>

          {/* 4가지 장점 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BENEFITS.map(b => (
              <div
                key={b.title}
                className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <b.icon className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{b.title}</p>
                  <p className="text-xs text-blue-300/80 mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 핵심 기능 */}
          <div>
            <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest mb-2.5">핵심 자동화 기능</p>
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

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link href="/login" className="flex-1">
              <Button className="w-full h-11 text-base font-bold bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-900/40">
                지금 시작하기 — 무료 가입
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={dismiss}
              className="flex-1 h-11 text-sm bg-transparent border-white/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30"
            >
              예시 데이터 먼저 둘러보기
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
