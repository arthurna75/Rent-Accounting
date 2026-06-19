// -------------------------------------------------------
// 예시(데모) 데이터 — 비로그인 또는 데이터 미등록 사용자에게 표시
// -------------------------------------------------------

export const SAMPLE_ORG = {
  name: '홍길동 임대사업',
  owner_name: '홍길동',
  rental_type: '혼합',
  business_number: '123-45-67890',
}

// ------ 부동산 ------
export const SAMPLE_PROPERTIES = [
  {
    id: 'sp1', name: '강남 오피스텔', property_type: '오피스텔',
    address_road: '서울 강남구 테헤란로 123', address_detail: '101호',
    rental_tax_type: '과세', acquisition_cost: 300_000_000,
    building_area: 84.5, useful_life: 40, depreciation_method: '정액법',
    building_value: 180_000_000, salvage_value: 0, is_active: true,
    acquisition_date: '2020-03-15',
    activeContracts: 1,
  },
  {
    id: 'sp2', name: '서초 아파트', property_type: '아파트',
    address_road: '서울 서초구 서초대로 456', address_detail: '305호',
    rental_tax_type: '면세', acquisition_cost: 450_000_000,
    building_area: 59.3, useful_life: 40, depreciation_method: '정액법',
    building_value: 220_000_000, salvage_value: 0, is_active: true,
    acquisition_date: '2019-07-01',
    activeContracts: 1,
  },
  {
    id: 'sp3', name: '마포 다세대', property_type: '다세대',
    address_road: '서울 마포구 마포대로 789', address_detail: null,
    rental_tax_type: '면세', acquisition_cost: 180_000_000,
    building_area: 45.2, useful_life: 40, depreciation_method: '정액법',
    building_value: 90_000_000, salvage_value: 0, is_active: true,
    acquisition_date: '2021-01-20',
    activeContracts: 0,
  },
  {
    id: 'sp4', name: '송파 상가', property_type: '상가',
    address_road: '서울 송파구 올림픽로 321', address_detail: '1층',
    rental_tax_type: '과세', acquisition_cost: 250_000_000,
    building_area: 62.0, useful_life: 40, depreciation_method: '정액법',
    building_value: 140_000_000, salvage_value: 0, is_active: true,
    acquisition_date: '2022-05-10',
    activeContracts: 1,
  },
  {
    id: 'sp5', name: '용산 오피스텔', property_type: '오피스텔',
    address_road: '서울 용산구 이태원로 654', address_detail: '502호',
    rental_tax_type: '과세', acquisition_cost: 200_000_000,
    building_area: 33.5, useful_life: 40, depreciation_method: '정액법',
    building_value: 110_000_000, salvage_value: 0, is_active: true,
    acquisition_date: '2023-09-01',
    activeContracts: 1,
  },
]

// ------ 임대계약 ------
export const SAMPLE_CONTRACTS = [
  {
    id: 'sc1', contract_number: 'C-2026-001',
    property_name: '강남 오피스텔', property_id: 'sp1',
    lessee_name: '홍길동', lessee_phone: '010-1234-5678',
    contract_type: '월세' as const, deposit_amount: 10_000_000, monthly_rent: 500_000,
    vat_included: false, payment_due_day: 5,
    start_date: '2026-01-01', end_date: '2026-12-31', status: 'active' as const,
    auto_renewal: true,
  },
  {
    id: 'sc2', contract_number: 'C-2026-002',
    property_name: '서초 아파트', property_id: 'sp2',
    lessee_name: '이순신', lessee_phone: '010-2345-6789',
    contract_type: '전세' as const, deposit_amount: 200_000_000, monthly_rent: 0,
    vat_included: false, payment_due_day: 1,
    start_date: '2026-03-01', end_date: '2028-02-28', status: 'active' as const,
    auto_renewal: false,
  },
  {
    id: 'sc3', contract_number: 'C-2025-001',
    property_name: '마포 다세대', property_id: 'sp3',
    lessee_name: '김철수', lessee_phone: '010-3456-7890',
    contract_type: '월세' as const, deposit_amount: 5_000_000, monthly_rent: 300_000,
    vat_included: false, payment_due_day: 10,
    start_date: '2025-01-01', end_date: '2025-12-31', status: 'expired' as const,
    auto_renewal: false,
  },
  {
    id: 'sc4', contract_number: 'C-2026-003',
    property_name: '송파 상가', property_id: 'sp4',
    lessee_name: '박영희', lessee_phone: '010-4567-8901',
    contract_type: '월세' as const, deposit_amount: 30_000_000, monthly_rent: 800_000,
    vat_included: true, payment_due_day: 15,
    start_date: '2026-02-01', end_date: '2027-01-31', status: 'active' as const,
    auto_renewal: true,
  },
  {
    id: 'sc5', contract_number: 'C-2026-004',
    property_name: '용산 오피스텔', property_id: 'sp5',
    lessee_name: '최민수', lessee_phone: '010-5678-9012',
    contract_type: '반전세' as const, deposit_amount: 20_000_000, monthly_rent: 600_000,
    vat_included: false, payment_due_day: 1,
    start_date: '2026-04-01', end_date: '2027-03-31', status: 'active' as const,
    auto_renewal: false,
  },
]

// ------ 대시보드 KPI ------
export const SAMPLE_STATS = {
  total_properties: 5,
  active_contracts: 4,
  monthly_rental_income: 2_380_000,
  unpaid_rent_amount: 800_000,
  total_deposit: 265_000_000,
  occupancy_rate: 80,
}

export const SAMPLE_EXPIRING_CONTRACTS = [
  { id: 'sc1', lessee_name: '홍길동', property_name: '강남 오피스텔', end_date: '2026-12-31', monthly_rent: 500_000, deposit_amount: 10_000_000 },
  { id: 'sc4', lessee_name: '박영희', property_name: '송파 상가',     end_date: '2027-01-31', monthly_rent: 800_000, deposit_amount: 30_000_000 },
  { id: 'sc5', lessee_name: '최민수', property_name: '용산 오피스텔', end_date: '2027-03-31', monthly_rent: 600_000, deposit_amount: 20_000_000 },
]

// ------ 분개장 ------
export const SAMPLE_JOURNAL_ENTRIES = [
  { id: 'je1', entry_number: '2026-000001', entry_date: '2026-01-01', description: '보증금수령 – 홍길동(강남 오피스텔)', entry_type: '보증금', status: 'posted', total_debit: 10_000_000, total_credit: 10_000_000 },
  { id: 'je2', entry_number: '2026-000002', entry_date: '2026-03-01', description: '전세보증금수령 – 이순신(서초 아파트)', entry_type: '보증금', status: 'posted', total_debit: 200_000_000, total_credit: 200_000_000 },
  { id: 'je3', entry_number: '2026-000003', entry_date: '2026-06-05', description: '임대료수령 – 홍길동 6월분', entry_type: '임대료', status: 'posted', total_debit: 500_000, total_credit: 500_000 },
  { id: 'je4', entry_number: '2026-000004', entry_date: '2026-06-15', description: '임대료수령 – 박영희 6월분(부가세포함)', entry_type: '임대료', status: 'posted', total_debit: 880_000, total_credit: 880_000 },
  { id: 'je5', entry_number: '2026-000005', entry_date: '2026-06-30', description: '감가상각비 계상 – 강남 오피스텔 6월', entry_type: '감가상각', status: 'posted', total_debit: 375_000, total_credit: 375_000 },
]

// ------ 감가상각 ------
export const SAMPLE_DEPRECIATION = [
  { id: 'sd1', property_name: '강남 오피스텔', building_value: 180_000_000, useful_life: 40, annual_depreciation: 4_500_000, monthly_depreciation: 375_000, accumulated: 2_625_000, book_value: 177_375_000 },
  { id: 'sd2', property_name: '서초 아파트',   building_value: 220_000_000, useful_life: 40, annual_depreciation: 5_500_000, monthly_depreciation: 458_333, accumulated: 4_583_330, book_value: 215_416_670 },
  { id: 'sd3', property_name: '마포 다세대',   building_value: 90_000_000,  useful_life: 40, annual_depreciation: 2_250_000, monthly_depreciation: 187_500, accumulated: 1_125_000, book_value: 88_875_000 },
  { id: 'sd4', property_name: '송파 상가',     building_value: 140_000_000, useful_life: 40, annual_depreciation: 3_500_000, monthly_depreciation: 291_667, accumulated: 875_001, book_value: 139_124_999 },
  { id: 'sd5', property_name: '용산 오피스텔', building_value: 110_000_000, useful_life: 40, annual_depreciation: 2_750_000, monthly_depreciation: 229_167, accumulated: 687_501, book_value: 109_312_499 },
]

// ------ 간주임대료 ------
export const SAMPLE_DEEMED_RENTAL = [
  { id: 'dr1', lessee_name: '홍길동', property_name: '강남 오피스텔', contract_type: '월세',   deposit_amount: 10_000_000,  days: 365, base_rate: 2.9, deemed_rent: 290_000,   taxable_rent: 0 },
  { id: 'dr2', lessee_name: '이순신', property_name: '서초 아파트',   contract_type: '전세',   deposit_amount: 200_000_000, days: 306, base_rate: 2.9, deemed_rent: 4_876_712, taxable_rent: 4_876_712 },
  { id: 'dr3', lessee_name: '박영희', property_name: '송파 상가',     contract_type: '월세',   deposit_amount: 30_000_000,  days: 334, base_rate: 2.9, deemed_rent: 797_808,  taxable_rent: 0 },
  { id: 'dr4', lessee_name: '최민수', property_name: '용산 오피스텔', contract_type: '반전세', deposit_amount: 20_000_000,  days: 275, base_rate: 2.9, deemed_rent: 437_260,  taxable_rent: 437_260 },
]

// ------ 재무상태표 ------
export const SAMPLE_BALANCE_SHEET = {
  assets: {
    current: [
      { name: '현금및예금', amount: 45_000_000 },
      { name: '미수임대료', amount: 800_000 },
    ],
    noncurrent: [
      { name: '건물',            amount: 740_000_000 },
      { name: '감가상각누계액', amount: -9_895_832 },
      { name: '토지',            amount: 490_000_000 },
    ],
  },
  liabilities: {
    current: [
      { name: '예수부가가치세', amount: 80_000 },
      { name: '미지급세금',     amount: 500_000 },
    ],
    noncurrent: [
      { name: '임대보증금', amount: 265_000_000 },
    ],
  },
  equity: [
    { name: '자본금',    amount: 1_000_000_000 },
    { name: '이익잉여금', amount: 324_168 },
  ],
}

// ------ 손익계산서 ------
export const SAMPLE_INCOME_STATEMENT = {
  revenue: [
    { name: '임대수익',     amount: 14_280_000 },
    { name: '부가가치세수익', amount: 480_000 },
  ],
  expenses: [
    { name: '감가상각비', amount: 9_895_832 },
    { name: '수선유지비', amount: 560_000 },
    { name: '보험료',     amount: 0 },
  ],
}

// ------ 시산표 ------
export const SAMPLE_TRIAL_BALANCE = [
  { code: '101', name: '현금및예금', account_type: '자산', debit: 265_800_000, credit: 220_800_000, balance: 45_000_000 },
  { code: '110', name: '미수임대료', account_type: '자산', debit: 800_000,     credit: 0,           balance: 800_000 },
  { code: '201', name: '건물',       account_type: '자산', debit: 740_000_000, credit: 0,           balance: 740_000_000 },
  { code: '202', name: '감가상각누계액', account_type: '자산', debit: 0,         credit: 9_895_832,   balance: -9_895_832 },
  { code: '203', name: '토지',       account_type: '자산', debit: 490_000_000, credit: 0,           balance: 490_000_000 },
  { code: '301', name: '예수부가가치세', account_type: '부채', debit: 400_000,   credit: 480_000,     balance: -80_000 },
  { code: '302', name: '미지급세금', account_type: '부채', debit: 0,           credit: 500_000,     balance: -500_000 },
  { code: '310', name: '임대보증금', account_type: '부채', debit: 0,           credit: 265_000_000, balance: -265_000_000 },
  { code: '401', name: '자본금',     account_type: '자본', debit: 0,           credit: 1_000_000_000, balance: -1_000_000_000 },
  { code: '501', name: '임대수익',   account_type: '수익', debit: 0,           credit: 14_280_000,  balance: -14_280_000 },
  { code: '502', name: '부가가치세수익', account_type: '수익', debit: 0,         credit: 480_000,     balance: -480_000 },
  { code: '601', name: '감가상각비', account_type: '비용', debit: 9_895_832,   credit: 0,           balance: 9_895_832 },
  { code: '602', name: '수선유지비', account_type: '비용', debit: 560_000,     credit: 0,           balance: 560_000 },
]

// ------ 계정과목 (일부) ------
export const SAMPLE_COA = [
  { code: '101', name: '현금및예금',     account_type: '자산', normal_balance: '차변', is_system: true  },
  { code: '110', name: '미수임대료',     account_type: '자산', normal_balance: '차변', is_system: true  },
  { code: '201', name: '건물',           account_type: '자산', normal_balance: '차변', is_system: true  },
  { code: '202', name: '감가상각누계액', account_type: '자산', normal_balance: '대변', is_system: true  },
  { code: '203', name: '토지',           account_type: '자산', normal_balance: '차변', is_system: true  },
  { code: '301', name: '예수부가가치세', account_type: '부채', normal_balance: '대변', is_system: true  },
  { code: '310', name: '임대보증금',     account_type: '부채', normal_balance: '대변', is_system: true  },
  { code: '401', name: '자본금',         account_type: '자본', normal_balance: '대변', is_system: true  },
  { code: '501', name: '임대수익',       account_type: '수익', normal_balance: '대변', is_system: true  },
  { code: '601', name: '감가상각비',     account_type: '비용', normal_balance: '차변', is_system: true  },
  { code: '602', name: '수선유지비',     account_type: '비용', normal_balance: '차변', is_system: true  },
  { code: '603', name: '보험료',         account_type: '비용', normal_balance: '차변', is_system: false },
]
