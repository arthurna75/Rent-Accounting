/**
 * 복식회계 분개 생성 엔진
 * 모든 거래는 차변 합계 = 대변 합계 보장
 */
import type {
  JournalEntry,
  JournalEntryLine,
  JournalEntryType,
  LeaseContract,
  Property,
  DepositTransaction,
  RentTransaction,
} from '@/types/database'

export interface JournalLineInput {
  account_code: string    // 계정과목 코드 (DB 조회용)
  debit_amount: number
  credit_amount: number
  description?: string
  property_id?: string
  contract_id?: string
}

export interface JournalEntryInput {
  entry_date: string
  description: string
  entry_type: JournalEntryType
  reference_id?: string
  reference_type?: string
  lines: JournalLineInput[]
}

/** 차변/대변 합계가 일치하는지 검증 */
export function validateBalance(lines: JournalLineInput[]): boolean {
  const totalDebit = lines.reduce((s, l) => s + l.debit_amount, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)
  return Math.abs(totalDebit - totalCredit) < 0.01  // 부동소수점 허용오차
}

/** 밸런스 검증 후 에러 throw */
export function assertBalance(lines: JournalLineInput[]): void {
  if (!validateBalance(lines)) {
    const totalDebit = lines.reduce((s, l) => s + l.debit_amount, 0)
    const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)
    throw new Error(
      `복식회계 불균형: 차변 ${formatKRW(totalDebit)} ≠ 대변 ${formatKRW(totalCredit)}`
    )
  }
}

// ── 자동 분개 생성 패턴 ────────────────────────────────────

/**
 * 임대료 수령 분개
 * 과세(상가): 보통예금 Dr / 임대수익 Cr + 예수부가가치세 Cr
 * 면세(주택): 보통예금 Dr / 임대수익 Cr
 */
export function createRentReceiptJournal(params: {
  contract: LeaseContract
  rentAmount: number
  vatAmount: number
  entryDate: string
  description?: string
}): JournalEntryInput {
  const { contract, rentAmount, vatAmount, entryDate, description } = params
  const totalAmount = rentAmount + vatAmount

  const lines: JournalLineInput[] = [
    {
      account_code: '102',  // 보통예금
      debit_amount: totalAmount,
      credit_amount: 0,
      description: description ?? `${contract.lessee_name} 임대료`,
      contract_id: contract.id,
    },
    {
      account_code: '510',  // 임대수익
      debit_amount: 0,
      credit_amount: rentAmount,
      contract_id: contract.id,
    },
  ]

  if (vatAmount > 0) {
    lines.push({
      account_code: '340',  // 예수부가가치세
      debit_amount: 0,
      credit_amount: vatAmount,
      contract_id: contract.id,
    })
  }

  assertBalance(lines)

  return {
    entry_date: entryDate,
    description: description ?? `임대료 수령 — ${contract.lessee_name}`,
    entry_type: '임대수익',
    reference_id: contract.id,
    reference_type: 'lease_contracts',
    lines,
  }
}

/**
 * 미수임대료 계상 분개 (월 결산 시)
 */
export function createAccruedRentJournal(params: {
  contract: LeaseContract
  rentAmount: number
  entryDate: string
}): JournalEntryInput {
  const { contract, rentAmount, entryDate } = params
  const lines: JournalLineInput[] = [
    {
      account_code: '110',  // 미수임대료
      debit_amount: rentAmount,
      credit_amount: 0,
      contract_id: contract.id,
    },
    {
      account_code: '510',  // 임대수익
      debit_amount: 0,
      credit_amount: rentAmount,
      contract_id: contract.id,
    },
  ]
  assertBalance(lines)
  return {
    entry_date: entryDate,
    description: `미수임대료 계상 — ${contract.lessee_name}`,
    entry_type: '임대수익',
    reference_id: contract.id,
    reference_type: 'lease_contracts',
    lines,
  }
}

/**
 * 보증금 수령 분개
 * 보통예금 Dr / 임대보증금 Cr
 */
export function createDepositReceiptJournal(params: {
  contract: LeaseContract
  amount: number
  entryDate: string
}): JournalEntryInput {
  const { contract, amount, entryDate } = params
  const lines: JournalLineInput[] = [
    {
      account_code: '102',  // 보통예금
      debit_amount: amount,
      credit_amount: 0,
      contract_id: contract.id,
    },
    {
      account_code: '310',  // 임대보증금
      debit_amount: 0,
      credit_amount: amount,
      contract_id: contract.id,
    },
  ]
  assertBalance(lines)
  return {
    entry_date: entryDate,
    description: `보증금 수령 — ${contract.lessee_name}`,
    entry_type: '보증금수령',
    reference_id: contract.id,
    reference_type: 'lease_contracts',
    lines,
  }
}

/**
 * 보증금 반환 분개
 * 임대보증금 Dr / 보통예금 Cr
 */
export function createDepositRefundJournal(params: {
  contract: LeaseContract
  amount: number
  entryDate: string
}): JournalEntryInput {
  const { contract, amount, entryDate } = params
  const lines: JournalLineInput[] = [
    {
      account_code: '310',  // 임대보증금
      debit_amount: amount,
      credit_amount: 0,
      contract_id: contract.id,
    },
    {
      account_code: '102',  // 보통예금
      debit_amount: 0,
      credit_amount: amount,
      contract_id: contract.id,
    },
  ]
  assertBalance(lines)
  return {
    entry_date: entryDate,
    description: `보증금 반환 — ${contract.lessee_name}`,
    entry_type: '보증금반환',
    reference_id: contract.id,
    reference_type: 'lease_contracts',
    lines,
  }
}

/**
 * 감가상각 분개
 * 감가상각비 Dr / 건물감가상각누계액 Cr
 */
export function createDepreciationJournal(params: {
  property: Property
  amount: number
  entryDate: string
  period: string   // 예: "2026년 6월"
}): JournalEntryInput {
  const { property, amount, entryDate, period } = params
  const lines: JournalLineInput[] = [
    {
      account_code: '610',  // 감가상각비
      debit_amount: amount,
      credit_amount: 0,
      property_id: property.id,
      description: `${property.name} ${period} 감가상각`,
    },
    {
      account_code: '201',  // 건물감가상각누계액
      debit_amount: 0,
      credit_amount: amount,
      property_id: property.id,
    },
  ]
  assertBalance(lines)
  return {
    entry_date: entryDate,
    description: `감가상각비 — ${property.name} ${period}`,
    entry_type: '감가상각',
    reference_id: property.id,
    reference_type: 'properties',
    lines,
  }
}

/**
 * 간주임대료 분개 (세무 목적 계상)
 * 미수간주임대료 Dr / 간주임대료수익 Cr
 */
export function createDeemedRentalJournal(params: {
  contract: LeaseContract
  deemedIncome: number
  entryDate: string
  fiscalYear: number
}): JournalEntryInput {
  const { contract, deemedIncome, entryDate, fiscalYear } = params
  const lines: JournalLineInput[] = [
    {
      account_code: '111',  // 미수간주임대료
      debit_amount: deemedIncome,
      credit_amount: 0,
      contract_id: contract.id,
    },
    {
      account_code: '511',  // 간주임대료수익
      debit_amount: 0,
      credit_amount: deemedIncome,
      contract_id: contract.id,
    },
  ]
  assertBalance(lines)
  return {
    entry_date: entryDate,
    description: `간주임대료 계상 — ${contract.lessee_name} ${fiscalYear}년`,
    entry_type: '간주임대료',
    reference_id: contract.id,
    reference_type: 'lease_contracts',
    lines,
  }
}

// ── 역분개 (Reversal) ────────────────────────────────────

/** 기존 분개의 역분개 생성 (차변↔대변 전환) */
export function createReversalEntry(
  original: JournalEntryInput,
  reversalDate: string,
): JournalEntryInput {
  return {
    ...original,
    entry_date: reversalDate,
    description: `[역분개] ${original.description}`,
    lines: original.lines.map(line => ({
      ...line,
      debit_amount: line.credit_amount,
      credit_amount: line.debit_amount,
    })),
  }
}

// ── 유틸 ─────────────────────────────────────────────────

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

export function sumDebit(lines: JournalLineInput[]): number {
  return lines.reduce((s, l) => s + l.debit_amount, 0)
}

export function sumCredit(lines: JournalLineInput[]): number {
  return lines.reduce((s, l) => s + l.credit_amount, 0)
}
