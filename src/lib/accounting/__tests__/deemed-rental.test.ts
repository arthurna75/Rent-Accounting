import { describe, it, expect } from 'vitest'
import {
  calculateDeemedRental,
  calculateRentalDays,
  calculateAnnualDeemedRental,
  totalTaxableDeemedRental,
} from '../deemed-rental'

describe('임대일수 계산', () => {
  it('1년 전체 임대: 365일', () => {
    const days = calculateRentalDays(
      new Date('2026-01-01'),
      new Date('2026-12-31'),
      2026,
    )
    expect(days).toBe(365)
  })

  it('반년 임대 (7월~12월): 184일', () => {
    const days = calculateRentalDays(
      new Date('2026-07-01'),
      new Date('2026-12-31'),
      2026,
    )
    expect(days).toBe(184)
  })

  it('연도와 겹치지 않으면 0', () => {
    const days = calculateRentalDays(
      new Date('2025-01-01'),
      new Date('2025-12-31'),
      2026,
    )
    expect(days).toBe(0)
  })
})

describe('간주임대료 계산 — 주택', () => {
  const RATE = 0.029  // 기준이율 2.9%

  it('보증금 3억 이하: 간주임대료 없음', () => {
    const result = calculateDeemedRental({
      depositAmount: 300_000_000,
      standardRate: RATE,
      rentalDays: 365,
      isResidential: true,
    })
    expect(result.taxableDeemedIncome).toBe(0)
    expect(result.taxableDepositBase).toBe(0)
  })

  it('보증금 5억: 2억 초과분에만 과세', () => {
    const result = calculateDeemedRental({
      depositAmount: 500_000_000,
      standardRate: RATE,
      rentalDays: 365,
      isResidential: true,
    })
    // 과세 기준 = 5억 - 3억 = 2억
    expect(result.taxableDepositBase).toBe(200_000_000)
    // 간주임대료 = 2억 × 2.9% = 5,800,000원
    expect(result.taxableDeemedIncome).toBe(5_800_000)
  })

  it('반년 임대 (182일): 일할 계산', () => {
    const result = calculateDeemedRental({
      depositAmount: 500_000_000,
      standardRate: RATE,
      rentalDays: 182,
      isResidential: true,
    })
    const expected = Math.round(200_000_000 * RATE * (182 / 365))
    expect(result.taxableDeemedIncome).toBe(expected)
  })
})

describe('간주임대료 계산 — 상가', () => {
  const RATE = 0.029

  it('상가: 보증금 전액 과세', () => {
    const result = calculateDeemedRental({
      depositAmount: 100_000_000,
      standardRate: RATE,
      rentalDays: 365,
      isResidential: false,
    })
    expect(result.taxableDepositBase).toBe(100_000_000)
    // 1억 × 2.9% = 2,900,000원
    expect(result.taxableDeemedIncome).toBe(2_900_000)
  })

  it('금융자산 차감 후 계산', () => {
    const result = calculateDeemedRental({
      depositAmount: 200_000_000,
      standardRate: RATE,
      rentalDays: 365,
      isResidential: false,
      financialAssets: 50_000_000,
    })
    // 순보증금 = 2억 - 5천만 = 1억5천
    expect(result.taxableDepositBase).toBe(150_000_000)
  })
})

describe('연간 간주임대료 일괄 계산', () => {
  it('여러 계약의 간주임대료 합산', () => {
    const contracts = [
      {
        id: 'c1',
        lessee_name: '홍길동',
        deposit_amount: 500_000_000,  // 5억 (3억 초과)
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        property: { rental_tax_type: '면세' as const },
      },
      {
        id: 'c2',
        lessee_name: '이순신',
        deposit_amount: 100_000_000,  // 1억 (상가 전액)
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        property: { rental_tax_type: '과세' as const },
      },
    ]

    const results = calculateAnnualDeemedRental(contracts, 2026, 0.029)
    expect(results).toHaveLength(2)

    const total = totalTaxableDeemedRental(results)
    // 홍길동: 2억 × 2.9% = 5,800,000
    // 이순신: 1억 × 2.9% = 2,900,000
    // 합계: 8,700,000
    expect(total).toBe(8_700_000)
  })
})
