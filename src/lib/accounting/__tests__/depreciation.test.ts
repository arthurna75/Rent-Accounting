import { describe, it, expect } from 'vitest'
import {
  straightLineMonthly,
  decliningBalanceRate,
  generateDepreciationSchedule,
  calculateMonthlyDepreciation,
  annualDepreciation,
} from '../depreciation'
import type { Property } from '@/types/database'

const mockProperty = (overrides = {}): Property => ({
  id: 'prop-1',
  organization_id: 'org-1',
  name: '테스트 건물',
  property_type: '상가',
  rental_tax_type: '과세',
  address_road: '서울시 강남구 1',
  address_detail: null,
  sido: null, sigungu: null,
  land_area: 100, building_area: 200, floors: 3,
  acquisition_date: '2020-01-01',
  acquisition_cost: 500_000_000,
  land_value: 200_000_000,
  building_value: 300_000_000,  // 감가상각 대상 3억
  useful_life: 40,
  depreciation_method: '정액법',
  salvage_value: 0,
  registration_number: null,
  is_active: true,
  notes: null,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
  ...overrides,
})

describe('정액법', () => {
  it('월 상각액 = (건물가 - 잔존가) / 내용연수 / 12', () => {
    const monthly = straightLineMonthly(300_000_000, 40, 0)
    expect(monthly).toBe(625_000)  // 300,000,000 / 40 / 12
  })

  it('잔존가액 1원인 경우', () => {
    const monthly = straightLineMonthly(300_000_000, 40, 1)
    // (300,000,000 - 1) / 40 / 12 ≈ 624,999.998 → 반올림 625,000
    expect(monthly).toBeCloseTo(625_000, -2)
  })
})

describe('정률법', () => {
  it('상각률 계산 (건물 40년)', () => {
    const rate = decliningBalanceRate(300_000_000, 40, 1)
    // 이론적 정률법 상각률
    expect(rate).toBeGreaterThan(0)
    expect(rate).toBeLessThan(1)
  })
})

describe('감가상각 스케줄 생성', () => {
  it('정액법 스케줄: 매월 동일 금액', () => {
    const property = mockProperty()
    const schedule = generateDepreciationSchedule(property, 2026, 2026)

    expect(schedule).toHaveLength(12)
    const amounts = schedule.map(s => s.depreciation_amount)
    const firstAmount = amounts[0]
    amounts.forEach(a => expect(a).toBe(firstAmount))  // 정액법 → 균등
  })

  it('취득월 이전은 스케줄에 포함 안 됨', () => {
    const property = mockProperty({ acquisition_date: '2026-06-01' })
    const schedule = generateDepreciationSchedule(property, 2026, 2026)

    expect(schedule.length).toBe(7)  // 6~12월 = 7개월
    expect(schedule[0].period_month).toBe(6)
  })

  it('누계 상각액은 단조증가', () => {
    const property = mockProperty()
    const schedule = generateDepreciationSchedule(property, 2026, 2027)

    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].accumulated_depreciation).toBeGreaterThan(
        schedule[i - 1].accumulated_depreciation
      )
    }
  })

  it('장부가액 = 건물가 - 누계상각액', () => {
    const property = mockProperty()
    const schedule = generateDepreciationSchedule(property, 2026, 2026)

    for (const s of schedule) {
      expect(Math.abs(s.book_value - (s.depreciable_cost - s.accumulated_depreciation)))
        .toBeLessThan(1)
    }
  })

  it('연간 감가상각비 합계', () => {
    const property = mockProperty()
    const schedule = generateDepreciationSchedule(property, 2026, 2026)
    const annual = annualDepreciation(schedule)

    // 연간 = 월 625,000 × 12 = 7,500,000
    expect(annual).toBe(7_500_000)
  })
})

describe('단월 감가상각 계산', () => {
  it('누계 0에서 시작하는 첫 달 계산', () => {
    const property = mockProperty()
    const result = calculateMonthlyDepreciation(property, 2026, 1, 0)

    expect(result).not.toBeNull()
    expect(result!.depreciation_amount).toBe(625_000)
    expect(result!.accumulated_depreciation).toBe(625_000)
    expect(result!.book_value).toBe(300_000_000 - 625_000)
  })

  it('잔존가 이하에서는 null 반환', () => {
    const property = mockProperty({ salvage_value: 0 })
    // 건물가 3억, 이미 3억 상각 완료
    const result = calculateMonthlyDepreciation(property, 2026, 1, 300_000_000)
    expect(result).toBeNull()
  })
})
