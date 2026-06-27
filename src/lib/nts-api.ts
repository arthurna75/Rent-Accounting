/**
 * 국세청(NTS) API 클라이언트
 * - 사업자등록 상태조회: ODCLOUD nts-businessman/v1/status (기존 verify-biz와 동일 엔드포인트)
 * - 세금계산서 진위확인: ODCLOUD nts-businessman/v1/validate (지원 시 사용, fallback 있음)
 * - 현금영수증 승인번호 형식 검증 + 홈택스 확인 안내
 */

const ODCLOUD_BASE = 'https://api.odcloud.kr/api'

function getApiKey(): string | null {
  return process.env.ODCLOUD_API_KEY?.replace(/^﻿/, '').trim() || null
}

export interface NtsVerifyResult {
  verified: boolean
  api_used: boolean
  method: 'tax_invoice' | 'cash_receipt' | 'biz_status_fallback' | 'format_only'
  message: string
  hometax_url?: string
  raw?: Record<string, unknown>
}

// 세금계산서 승인번호 형식 검증 (24자리 숫자)
function isTaxInvoiceApprovalFormat(no: string): boolean {
  return /^\d{24}$/.test(no.replace(/\D/g, ''))
}

// 현금영수증 승인번호 형식 검증 (8~12자리 숫자)
function isCashReceiptApprovalFormat(no: string): boolean {
  const digits = no.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 12
}

/**
 * 세금계산서 발행번호(국세청 승인번호) 진위확인
 * - ODCLOUD nts-businessman/v1/validate 시도
 * - API 미지원/키 없음 → 공급자 사업자 상태 확인으로 fallback
 */
export async function verifyTaxInvoice(params: {
  approvalNo: string
  supplierBizNo: string
  orgBizNo?: string
}): Promise<NtsVerifyResult> {
  const { approvalNo, supplierBizNo } = params
  const cleanNo = approvalNo.replace(/\D/g, '')

  if (!isTaxInvoiceApprovalFormat(cleanNo)) {
    return {
      verified: false,
      api_used: false,
      method: 'format_only',
      message: '세금계산서 승인번호는 24자리 숫자여야 합니다.',
    }
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return {
      verified: false,
      api_used: false,
      method: 'format_only',
      message: '형식 검증 통과 — 국세청 API 키 설정 후 실제 확인 가능합니다.',
      hometax_url: `https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml`,
    }
  }

  // 1차 시도: 전자세금계산서 진위확인 API (ODCLOUD)
  try {
    const url = `${ODCLOUD_BASE}/nts-businessman/v1/validate?serviceKey=${apiKey}&returnType=JSON`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ b_no: [supplierBizNo.replace(/\D/g, '')], approval_no: cleanNo }),
    })

    if (res.ok) {
      const json = await res.json() as Record<string, unknown>
      const data = (json?.data as Record<string, unknown>[] | undefined)?.[0] ?? json
      const valid = data?.valid === true || data?.result === 'Y' || data?.status === '01'
      return {
        verified: valid,
        api_used: true,
        method: 'tax_invoice',
        message: valid ? '세금계산서 진위 확인 완료' : '세금계산서 확인 불가 — 내역이 조회되지 않습니다.',
        raw: data as Record<string, unknown>,
      }
    }
  } catch {
    // 엔드포인트 미지원 → fallback
  }

  // Fallback: 공급자 사업자 상태 확인
  try {
    const bizResult = await verifyBusinessStatus(supplierBizNo)
    if (bizResult.api_used) {
      return {
        verified: bizResult.active,
        api_used: true,
        method: 'biz_status_fallback',
        message: bizResult.active
          ? `공급자 사업자 확인 완료 (${bizResult.message}) — 세금계산서 번호는 홈택스에서 직접 확인하세요.`
          : `공급자가 폐업/휴업 사업자입니다: ${bizResult.message}`,
        hometax_url: `https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml`,
        raw: bizResult.raw,
      }
    }
  } catch {
    // ignore
  }

  return {
    verified: false,
    api_used: false,
    method: 'format_only',
    message: '형식 검증 통과 — 홈택스에서 직접 확인하세요.',
    hometax_url: `https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml`,
  }
}

/**
 * 현금영수증 승인번호 확인
 * - 형식 검증 후 ODCLOUD 현금영수증 API 시도
 * - 미지원 시 홈택스 링크 안내
 */
export async function verifyCashReceipt(params: {
  approvalNo: string
  transactionDate?: string
}): Promise<NtsVerifyResult> {
  const { approvalNo } = params
  const cleanNo = approvalNo.replace(/\D/g, '')

  if (!isCashReceiptApprovalFormat(cleanNo)) {
    return {
      verified: false,
      api_used: false,
      method: 'format_only',
      message: '현금영수증 승인번호는 8~12자리 숫자여야 합니다.',
    }
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return {
      verified: false,
      api_used: false,
      method: 'format_only',
      message: '형식 검증 통과 — 국세청 API 키 설정 후 실제 확인 가능합니다.',
      hometax_url: `https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml`,
    }
  }

  // ODCLOUD 현금영수증 API 시도
  try {
    const url = `${ODCLOUD_BASE}/nts-cash-receipt/v1/status?serviceKey=${apiKey}&returnType=JSON`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ approval_no: cleanNo }),
    })

    if (res.ok) {
      const json = await res.json() as Record<string, unknown>
      const data = (json?.data as Record<string, unknown>[] | undefined)?.[0] ?? json
      const valid = data?.valid === true || data?.result === 'Y' || data?.status === '01'
      return {
        verified: valid,
        api_used: true,
        method: 'cash_receipt',
        message: valid ? '현금영수증 확인 완료' : '현금영수증 확인 불가 — 내역이 조회되지 않습니다.',
        raw: data as Record<string, unknown>,
      }
    }
  } catch {
    // 엔드포인트 미지원
  }

  return {
    verified: false,
    api_used: false,
    method: 'format_only',
    message: '형식 검증 통과 — 홈택스에서 직접 확인하세요.',
    hometax_url: `https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml`,
  }
}

/**
 * 사업자등록 상태 조회 (기존 verify-biz 로직 재사용)
 */
export async function verifyBusinessStatus(bizNo: string): Promise<{
  active: boolean
  api_used: boolean
  message: string
  raw?: Record<string, unknown>
}> {
  const digits = bizNo.replace(/\D/g, '')
  const apiKey = getApiKey()
  if (!apiKey) {
    return { active: true, api_used: false, message: 'API 키 없음' }
  }

  try {
    const url = `${ODCLOUD_BASE}/nts-businessman/v1/status?serviceKey=${apiKey}&returnType=JSON`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ b_no: [digits] }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json() as Record<string, unknown>
    const item = (json?.data as Record<string, unknown>[] | undefined)?.[0]
    if (!item) throw new Error('응답 없음')

    const sttCode = item.b_stt_cd as string
    const sttLabel = item.b_stt as string

    return {
      active: sttCode === '01',
      api_used: true,
      message: sttCode === '01' ? `정상 사업자 (${sttLabel})` : `${sttLabel}`,
      raw: item,
    }
  } catch (e) {
    return { active: true, api_used: false, message: (e as Error).message }
  }
}
