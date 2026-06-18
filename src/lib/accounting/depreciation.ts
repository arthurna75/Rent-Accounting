/**
 * 감가상각 계산 엔진
 * - 정액법(Straight-Line): 매월 균등 상각
 * - 정률법(Declining Balance): 잔부금액 × 상각률
 *
 * 한국 세법 기준:
 *   건물(철근콘크리트) 내용연수 40년, 잔존가액 0원
 *   상각률(정률법) = 1 - (잔존가액/취득가액)^(1/내용연수)
 */

import type { DepreciationSchedule, Property } from '@/types/database'

export interface DepreciationResult {
  fiscal_year: number
  period_month: number
  depreciable_cost: number
  depreciation_rate: number | null
  depreciation_amount: number
  accumulated_depreciation: number
  book_value: number
}

/** 정액법 월 상각액 */
export function straightLineMonthly(
  depreciableCost: number,
  usefulLifeYears: number,
  salvageValue = 0,
): number {
  const annual = (depreciableCost - salvageValue) / usefulLifeYears
  return roundWon(annual / 12)
}

/** 정률법 연간 상각률 */
export function decliningBalanceRate(
  depreciableCost: number,
  usefulLifeYears: number,
  salvageValue = 1,   // 세법상 최소 1원
): number {
  if (depreciableCost <= 0) return 0
  return 1 - Math.pow(Math.max(salvageValue, 1) / depreciableCost, 1 / usefulLifeYears)
}

/**
 * 특정 부동산의 전체 감가상각 스케줄 생성
 * 취득월부터 내용연수 종료월까지
 */
export function generateDepreciationSchedule(
  property: Property,
  fromYear: number,
  toYear: number,
): DepreciationResult[] {
  const {
    building_value,
    salvage_value,
    useful_life,
    depreciation_method,
    acquisition_date,
  } = property

  const depreciableCost = building_value ?? 0
  if (depreciableCost <= 0) return []

  const acquisitionDate = new Date(acquisition_date)
  const acquisitionYear = acquisitionDate.getFullYear()
  const acquisitionMonth = acquisitionDate.getMonth() + 1  // 1-12

  const results: DepreciationResult[] = []
  let accumulatedDepreciation = 0
  let currentBookValue = depreciableCost

  const monthlyRate =
    depreciation_method === '정액법'
      ? null
      : decliningBalanceRate(depreciableCost, useful_life, salvage_value)

  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      // 취득 이전 월 건너뜀
      if (year < acquisitionYear) continue
      if (year === acquisitionYear && month < acquisitionMonth) continue

      // 잔존가액 이하 건너뜀
      if (currentBookValue <= salvage_value) break

      let depreciation: number

      if (depreciation_method === '정액법') {
        depreciation = straightLineMonthly(depreciableCost, useful_life, salvage_value)
      } else {
        // 정률법: 연간 상각액을 12등분
        depreciation = roundWon((currentBookValue * (monthlyRate ?? 0)))
      }

      // 잔존가액 미만으로 내려가지 않도록
      depreciation = Math.min(depreciation, currentBookValue - salvage_value)

      accumulatedDepreciation += depreciation
      currentBookValue = depreciableCost - accumulatedDepreciation

      if (year >= fromYear && year <= toYear) {
        results.push({
          fiscal_year: year,
          period_month: month,
          depreciable_cost: depreciableCost,
          depreciation_rate: monthlyRate,
          depreciation_amount: depreciation,
          accumulated_depreciation: accumulatedDepreciation,
          book_value: currentBookValue,
        })
      }
    }
  }

  return results
}

/**
 * 특정 연월의 감가상각액만 계산 (단일 처리용)
 */
export function calculateMonthlyDepreciation(
  property: Property,
  year: number,
  month: number,
  existingAccumulated: number,
): DepreciationResult | null {
  const depreciableCost = property.building_value ?? 0
  if (depreciableCost <= 0) return null

  const currentBookValue = depreciableCost - existingAccumulated

  if (currentBookValue <= property.salvage_value) return null

  let depreciation: number

  if (property.depreciation_method === '정액법') {
    depreciation = straightLineMonthly(
      depreciableCost,
      property.useful_life,
      property.salvage_value,
    )
  } else {
    const rate = decliningBalanceRate(
      depreciableCost,
      property.useful_life,
      property.salvage_value,
    )
    depreciation = roundWon(currentBookValue * rate)
  }

  depreciation = Math.min(depreciation, currentBookValue - property.salvage_value)

  return {
    fiscal_year: year,
    period_month: month,
    depreciable_cost: depreciableCost,
    depreciation_rate:
      property.depreciation_method === '정률법'
        ? decliningBalanceRate(depreciableCost, property.useful_life, property.salvage_value)
        : null,
    depreciation_amount: depreciation,
    accumulated_depreciation: existingAccumulated + depreciation,
    book_value: currentBookValue - depreciation,
  }
}

/** 원 단위 반올림 */
function roundWon(amount: number): number {
  return Math.round(amount)
}

/** 연간 감가상각비 합계 */
export function annualDepreciation(schedules: DepreciationResult[]): number {
  return schedules.reduce((s, r) => s + r.depreciation_amount, 0)
}
