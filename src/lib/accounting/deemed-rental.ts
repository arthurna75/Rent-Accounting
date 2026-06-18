/**
 * 간주임대료 계산 엔진
 *
 * 근거: 소득세법 제25조, 소득세법 시행령 제53조
 *
 * 계산식:
 *   간주임대료 = (보증금 합계 - 임대사업 금융자산) × 기준이율 × (임대일수 / 365)
 *
 * 적용 대상:
 *   - 주택: 보증금 3억 초과분 (1주택자 중 기준시가 12억 이하 제외)
 *   - 상가: 보증금 전액
 *
 * 기준이율: 국세청 매년 고시 (standard_interest_rates 테이블)
 */

export interface DeemedRentalInput {
  depositAmount: number       // 보증금 총액
  standardRate: number        // 기준이율 (예: 0.029)
  rentalDays: number          // 임대일수
  isResidential: boolean      // 주택 여부
  totalDeposits?: number      // 전체 임차 보증금 합계 (주택용, 3억 초과 계산에 필요)
  financialAssets?: number    // 임대사업 관련 금융자산 (차감)
  exemptThreshold?: number    // 비과세 한도 (기본 3억)
}

export interface DeemedRentalResult {
  depositAmount: number
  standardRate: number
  rentalDays: number
  grossDeemedIncome: number       // 간주임대료 총액
  exemptThreshold: number         // 비과세 한도
  taxableDepositBase: number      // 과세 대상 보증금
  taxableDeemedIncome: number     // 과세 간주임대료
  calculationNote: string
}

/**
 * 간주임대료 계산
 */
export function calculateDeemedRental(input: DeemedRentalInput): DeemedRentalResult {
  const {
    depositAmount,
    standardRate,
    rentalDays,
    isResidential,
    financialAssets = 0,
    exemptThreshold = 300_000_000,  // 3억
  } = input

  // 금융자산 차감
  const adjustedDeposit = Math.max(0, depositAmount - financialAssets)

  // 주택: 3억 초과분만 과세
  let taxableDepositBase: number
  let calculationNote: string

  if (isResidential) {
    if (adjustedDeposit <= exemptThreshold) {
      taxableDepositBase = 0
      calculationNote = `주택임대: 보증금 ${formatKRW(adjustedDeposit)}이 3억 이하이므로 간주임대료 없음`
    } else {
      taxableDepositBase = adjustedDeposit - exemptThreshold
      calculationNote = `주택임대: 보증금 ${formatKRW(adjustedDeposit)} - 비과세한도 3억 = 과세기준 ${formatKRW(taxableDepositBase)}`
    }
  } else {
    // 상가: 전액 과세
    taxableDepositBase = adjustedDeposit
    calculationNote = `상가임대: 보증금 전액 ${formatKRW(adjustedDeposit)} 과세`
  }

  // 간주임대료 = 과세기준보증금 × 기준이율 × (임대일수 / 365)
  const grossDeemedIncome = roundWon(adjustedDeposit * standardRate * (rentalDays / 365))
  const taxableDeemedIncome = roundWon(taxableDepositBase * standardRate * (rentalDays / 365))

  return {
    depositAmount,
    standardRate,
    rentalDays,
    grossDeemedIncome,
    exemptThreshold,
    taxableDepositBase,
    taxableDeemedIncome,
    calculationNote,
  }
}

/**
 * 임대일수 계산 (계약 기간 중 해당 연도 임대일수)
 */
export function calculateRentalDays(
  contractStart: Date,
  contractEnd: Date,
  fiscalYear: number,
): number {
  // ISO 날짜 문자열(UTC 기준)과 일관성을 맞추기 위해 Date.UTC 사용
  const yearStart = new Date(Date.UTC(fiscalYear, 0, 1))   // 1월 1일 UTC
  const yearEnd = new Date(Date.UTC(fiscalYear, 11, 31))   // 12월 31일 UTC

  const effectiveStart = contractStart > yearStart ? contractStart : yearStart
  const effectiveEnd = contractEnd < yearEnd ? contractEnd : yearEnd

  if (effectiveEnd < effectiveStart) return 0

  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / msPerDay) + 1
}

/**
 * 다수 계약의 간주임대료 합산 (연간 종합)
 */
export interface ContractDeemedRental {
  contractId: string
  lesseeName: string
  depositAmount: number
  rentalDays: number
  result: DeemedRentalResult
}

export function calculateAnnualDeemedRental(
  contracts: Array<{
    id: string
    lessee_name: string
    deposit_amount: number
    start_date: string
    end_date: string
    property?: { rental_tax_type: '과세' | '면세' }
  }>,
  fiscalYear: number,
  standardRate: number,
): ContractDeemedRental[] {
  return contracts.map(c => {
    const isResidential = c.property?.rental_tax_type === '면세'
    const rentalDays = calculateRentalDays(
      new Date(c.start_date),
      new Date(c.end_date),
      fiscalYear,
    )

    const result = calculateDeemedRental({
      depositAmount: c.deposit_amount,
      standardRate,
      rentalDays,
      isResidential,
    })

    return {
      contractId: c.id,
      lesseeName: c.lessee_name,
      depositAmount: c.deposit_amount,
      rentalDays,
      result,
    }
  })
}

/** 총 과세 간주임대료 합계 */
export function totalTaxableDeemedRental(items: ContractDeemedRental[]): number {
  return items.reduce((s, i) => s + i.result.taxableDeemedIncome, 0)
}

function roundWon(n: number): number {
  return Math.round(n)
}

function formatKRW(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}
