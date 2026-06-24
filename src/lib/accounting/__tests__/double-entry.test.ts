import { describe, it, expect } from 'vitest'
import {
  validateBalance,
  assertBalance,
  createRentReceiptJournal,
  createDepositReceiptJournal,
  createDepositRefundJournal,
  createDepreciationJournal,
  createDeemedRentalJournal,
  createReversalEntry,
  sumDebit,
  sumCredit,
} from '../double-entry'
import type { LeaseContract, Property } from '@/types/database'

const mockContract = (overrides = {}): LeaseContract => ({
  id: 'contract-1',
  organization_id: 'org-1',
  property_id: 'prop-1',
  contract_number: 'C-2026-001',
  lessee_name: '홍길동',
  lessee_id_number: null,
  lessee_phone: null,
  lessee_email: null,
  contract_type: '월세',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  deposit_amount: 10_000_000,
  monthly_rent: 500_000,
  monthly_management_fee: null,
  vat_included: false,
  payment_due_day: 1,
  payment_condition: '선불',
  auto_renewal: false,
  auto_journal_rent: false,
  auto_journal_mgmt: false,
  auto_journal_deposit: false,
  auto_journal_broker: false,
  contract_date: null,
  status: 'active',
  termination_date: null,
  termination_reason: null,
  special_terms: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const mockProperty = (overrides = {}): Property => ({
  id: 'prop-1',
  organization_id: 'org-1',
  name: '테스트 빌딩',
  building_name: '테스트 빌딩',
  unit_number: '',
  property_type: '상가',
  rental_tax_type: '과세',
  address_road: '서울시 강남구 테헤란로 1',
  address_detail: null,
  sido: '서울',
  sigungu: '강남구',
  land_area: 100,
  building_area: 200,
  floors: 5,
  acquisition_date: '2020-01-01',
  acquisition_cost: 500_000_000,
  land_value: 200_000_000,
  building_value: 300_000_000,
  land_share_ratio: null,
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

describe('복식회계 밸런스 검증', () => {
  it('차변 = 대변이면 true 반환', () => {
    const lines = [
      { account_code: '102', debit_amount: 500_000, credit_amount: 0 },
      { account_code: '510', debit_amount: 0, credit_amount: 500_000 },
    ]
    expect(validateBalance(lines)).toBe(true)
  })

  it('차변 ≠ 대변이면 false 반환', () => {
    const lines = [
      { account_code: '102', debit_amount: 600_000, credit_amount: 0 },
      { account_code: '510', debit_amount: 0, credit_amount: 500_000 },
    ]
    expect(validateBalance(lines)).toBe(false)
  })

  it('불균형 시 assertBalance가 예외 throw', () => {
    const lines = [
      { account_code: '102', debit_amount: 700_000, credit_amount: 0 },
      { account_code: '510', debit_amount: 0, credit_amount: 500_000 },
    ]
    expect(() => assertBalance(lines)).toThrow('복식회계 불균형')
  })
})

describe('임대료 수령 분개', () => {
  it('주택 면세: 보통예금 Dr / 임대수익 Cr', () => {
    const contract = mockContract({ vat_included: false })
    const journal = createRentReceiptJournal({
      contract,
      rentAmount: 500_000,
      vatAmount: 0,
      entryDate: '2026-06-01',
    })

    expect(journal.entry_type).toBe('임대수익')
    expect(journal.lines).toHaveLength(2)
    expect(sumDebit(journal.lines)).toBe(500_000)
    expect(sumCredit(journal.lines)).toBe(500_000)

    const debitLine = journal.lines.find(l => l.debit_amount > 0)
    const creditLine = journal.lines.find(l => l.credit_amount > 0)
    expect(debitLine?.account_code).toBe('102')  // 보통예금
    expect(creditLine?.account_code).toBe('510')  // 임대수익
  })

  it('상가 과세: 보통예금 Dr / 임대수익 + 예수부가가치세 Cr', () => {
    const contract = mockContract({ vat_included: true, monthly_rent: 500_000 })
    const rentAmount = 500_000
    const vatAmount = 50_000  // 10%

    const journal = createRentReceiptJournal({
      contract,
      rentAmount,
      vatAmount,
      entryDate: '2026-06-01',
    })

    expect(journal.lines).toHaveLength(3)
    expect(sumDebit(journal.lines)).toBe(550_000)
    expect(sumCredit(journal.lines)).toBe(550_000)

    const vatLine = journal.lines.find(l => l.account_code === '340')
    expect(vatLine?.credit_amount).toBe(50_000)
  })
})

describe('보증금 수령/반환 분개', () => {
  it('보증금 수령: 보통예금 Dr / 임대보증금 Cr', () => {
    const contract = mockContract()
    const journal = createDepositReceiptJournal({
      contract,
      amount: 10_000_000,
      entryDate: '2026-01-01',
    })

    expect(journal.entry_type).toBe('보증금수령')
    expect(validateBalance(journal.lines)).toBe(true)

    const debitLine = journal.lines.find(l => l.debit_amount > 0)
    const creditLine = journal.lines.find(l => l.credit_amount > 0)
    expect(debitLine?.account_code).toBe('102')
    expect(creditLine?.account_code).toBe('310')
    expect(debitLine?.debit_amount).toBe(10_000_000)
  })

  it('보증금 반환: 임대보증금 Dr / 보통예금 Cr', () => {
    const contract = mockContract()
    const journal = createDepositRefundJournal({
      contract,
      amount: 10_000_000,
      entryDate: '2026-12-31',
    })

    expect(journal.entry_type).toBe('보증금반환')
    expect(validateBalance(journal.lines)).toBe(true)

    const debitLine = journal.lines.find(l => l.debit_amount > 0)
    const creditLine = journal.lines.find(l => l.credit_amount > 0)
    expect(debitLine?.account_code).toBe('310')  // 임대보증금
    expect(creditLine?.account_code).toBe('102')  // 보통예금
  })
})

describe('감가상각 분개', () => {
  it('정액법: 감가상각비 Dr / 건물감가상각누계액 Cr', () => {
    const property = mockProperty()
    // 건물가 3억, 내용연수 40년 → 연간 750만원 → 월 625,000원
    const expectedMonthly = Math.round(300_000_000 / 40 / 12)

    const journal = createDepreciationJournal({
      property,
      amount: expectedMonthly,
      entryDate: '2026-06-30',
      period: '2026년 6월',
    })

    expect(journal.entry_type).toBe('감가상각')
    expect(validateBalance(journal.lines)).toBe(true)

    const debit = journal.lines.find(l => l.debit_amount > 0)
    const credit = journal.lines.find(l => l.credit_amount > 0)
    expect(debit?.account_code).toBe('610')   // 감가상각비
    expect(credit?.account_code).toBe('201')  // 건물감가상각누계액
    expect(debit?.debit_amount).toBe(expectedMonthly)
  })
})

describe('역분개', () => {
  it('역분개는 원전표의 차변/대변을 반전시킨다', () => {
    const contract = mockContract()
    const original = createRentReceiptJournal({
      contract,
      rentAmount: 500_000,
      vatAmount: 0,
      entryDate: '2026-06-01',
    })

    const reversal = createReversalEntry(original, '2026-06-02')

    expect(reversal.description).toContain('[역분개]')
    expect(validateBalance(reversal.lines)).toBe(true)

    // 차변/대변 반전 확인
    for (let i = 0; i < original.lines.length; i++) {
      expect(reversal.lines[i].debit_amount).toBe(original.lines[i].credit_amount)
      expect(reversal.lines[i].credit_amount).toBe(original.lines[i].debit_amount)
    }
  })
})
