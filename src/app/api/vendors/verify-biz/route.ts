import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 국세청 사업자등록번호 체크섬 검증 (로컬, API 키 불필요)
function validateBizChecksum(bno: string): boolean {
  const digits = bno.replace(/\D/g, '')
  if (digits.length !== 10) return false
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * w[i]
  }
  sum += Math.floor((Number(digits[8]) * 5) / 10)
  const check = (10 - (sum % 10)) % 10
  return check === Number(digits[9])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_number } = await req.json() as { business_number: string }
  const digits = (business_number ?? '').replace(/\D/g, '')

  if (digits.length !== 10) {
    return NextResponse.json({ error: '사업자번호는 10자리여야 합니다.' }, { status: 400 })
  }

  // 1. 체크섬 검증 (로컬)
  const checksumOk = validateBizChecksum(digits)
  if (!checksumOk) {
    return NextResponse.json({
      valid: false,
      checksum: false,
      message: '유효하지 않은 사업자등록번호 형식입니다.',
    })
  }

  // 2. 국세청 API 조회 (API 키가 있을 때만)
  // BOM(﻿) 및 공백 제거 — Vercel 환경변수 복붙 시 BOM이 끼는 경우 방어
  const apiKey = process.env.ODCLOUD_API_KEY?.replace(/^﻿/, '').trim()
  if (!apiKey) {
    return NextResponse.json({
      valid: true,
      checksum: true,
      api_used: false,
      message: '형식 검증 통과 (국세청 조회는 API 키 설정 후 이용 가능)',
    })
  }

  try {
    // query + Authorization 헤더 동시 전달 (odcloud 키 방식에 따라 하나만 유효)
    const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${apiKey}&returnType=JSON`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ b_no: [digits] }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`국세청 API 오류: ${res.status}${errBody ? ` (${errBody.slice(0, 200)})` : ''}`)
    }

    const json = await res.json()
    const item = json?.data?.[0]

    if (!item) {
      throw new Error('응답 데이터 없음')
    }

    // b_stt_cd: "01"=계속사업자, "02"=휴업자, "03"=폐업자
    const sttCode = item.b_stt_cd as string
    const sttLabel = item.b_stt as string   // "계속사업자" | "휴업자" | "폐업자"
    const taxType  = item.tax_type as string // "부가가치세 일반과세자" 등

    return NextResponse.json({
      valid: sttCode === '01',
      checksum: true,
      api_used: true,
      status_code: sttCode,
      status: sttLabel,
      tax_type: taxType,
      end_dt: item.end_dt ?? null,
      message: sttCode === '01'
        ? `정상 사업자 (${taxType})`
        : sttCode === '02'
          ? `휴업 사업자 (휴업)`
          : `폐업 사업자 (폐업일: ${item.end_dt || '미상'})`,
    })
  } catch (e) {
    return NextResponse.json({
      valid: true,
      checksum: true,
      api_used: false,
      message: `형식 검증 통과 (국세청 조회 실패: ${(e as Error).message})`,
    })
  }
}
