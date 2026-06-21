// Auto-generated types from Supabase schema
// Run: npx supabase gen types typescript --linked > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AccountType = '자산' | '부채' | '자본' | '수익' | '비용'
export type NormalBalance = '차변' | '대변'
export type RentalType = '주택' | '상가' | '혼합'
export type PropertyType = '아파트' | '다세대' | '단독주택' | '상가' | '오피스텔' | '근린생활시설' | '기타'
export type ContractType = '월세' | '전세' | '반전세'
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated'
export type JournalEntryType = '일반' | '임대수익' | '보증금수령' | '보증금반환' | '감가상각' | '간주임대료' | '세금' | '관리비' | '비용지출'
export type EvidenceType = '현금영수증' | '세금계산서' | '영수증' | '사업자용 카드' | '기타'
export type JournalEntryStatus = 'draft' | 'posted' | 'reversed'
export type UserRole = 'owner' | 'accountant' | 'viewer'
export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise'
export type RentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived'
export type DepositTransactionType = '수령' | '반환' | '부분반환' | '증액' | '감액'
export type DepreciationMethod = '정액법' | '정률법'

// Mapped type trick: interfaces don't extend Record<string, unknown>, but mapped types do.
// AsRow<T> converts an interface to a homomorphic mapped type that satisfies GenericTable.Row.
type AsRow<T> = { [K in keyof T]: T[K] }

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: AsRow<Organization>
        Insert: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>
        Relationships: []
      }
      user_profiles: {
        Row: AsRow<UserProfile>
        Insert: Partial<Omit<UserProfile, 'created_at' | 'updated_at'>>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
        Relationships: [
          { foreignKeyName: "user_profiles_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      properties: {
        Row: AsRow<Property>
        Insert: Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<Property, 'id' | 'created_at'>>
        Relationships: [
          { foreignKeyName: "properties_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      lease_contracts: {
        Row: AsRow<LeaseContract>
        Insert: Partial<Omit<LeaseContract, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<LeaseContract, 'id' | 'created_at'>>
        Relationships: [
          { foreignKeyName: "lease_contracts_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
          { foreignKeyName: "lease_contracts_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      deposit_transactions: {
        Row: AsRow<DepositTransaction>
        Insert: Partial<Omit<DepositTransaction, 'id' | 'created_at'>>
        Update: Partial<Omit<DepositTransaction, 'id' | 'created_at'>>
        Relationships: []
      }
      rent_transactions: {
        Row: AsRow<RentTransaction>
        Insert: Partial<Omit<RentTransaction, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<RentTransaction, 'id' | 'created_at'>>
        Relationships: []
      }
      chart_of_accounts: {
        Row: AsRow<ChartOfAccount>
        Insert: Partial<Omit<ChartOfAccount, 'id' | 'created_at'>>
        Update: Partial<Omit<ChartOfAccount, 'id' | 'created_at'>>
        Relationships: []
      }
      fiscal_years: {
        Row: AsRow<FiscalYear>
        Insert: Partial<Omit<FiscalYear, 'id' | 'created_at'>>
        Update: Partial<Omit<FiscalYear, 'id' | 'created_at'>>
        Relationships: []
      }
      vendors: {
        Row: AsRow<Vendor>
        Insert: Partial<Omit<Vendor, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<Vendor, 'id' | 'created_at'>>
        Relationships: [
          { foreignKeyName: "vendors_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      journal_entries: {
        Row: AsRow<JournalEntry>
        Insert: Partial<Omit<JournalEntry, 'id' | 'created_at' | 'updated_at' | 'lines'>>
        Update: Partial<Omit<JournalEntry, 'id' | 'created_at' | 'lines'>>
        Relationships: []
      }
      journal_entry_lines: {
        Row: AsRow<JournalEntryLine>
        Insert: Partial<Omit<JournalEntryLine, 'id' | 'created_at' | 'account'>>
        Update: Partial<Omit<JournalEntryLine, 'id' | 'created_at' | 'account'>>
        Relationships: [
          { foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"; columns: ["journal_entry_id"]; isOneToOne: false; referencedRelation: "journal_entries"; referencedColumns: ["id"] },
          { foreignKeyName: "journal_entry_lines_account_id_fkey"; columns: ["account_id"]; isOneToOne: false; referencedRelation: "chart_of_accounts"; referencedColumns: ["id"] }
        ]
      }
      depreciation_schedules: {
        Row: AsRow<DepreciationSchedule>
        Insert: Partial<Omit<DepreciationSchedule, 'id' | 'created_at'>>
        Update: Partial<Omit<DepreciationSchedule, 'id' | 'created_at'>>
        Relationships: [
          { foreignKeyName: "depreciation_schedules_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] }
        ]
      }
      deemed_rental_calculations: {
        Row: AsRow<DeemedRentalCalculation>
        Insert: Partial<Omit<DeemedRentalCalculation, 'id' | 'created_at'>>
        Update: Partial<Omit<DeemedRentalCalculation, 'id' | 'created_at'>>
        Relationships: [
          { foreignKeyName: "deemed_rental_calculations_contract_id_fkey"; columns: ["contract_id"]; isOneToOne: false; referencedRelation: "lease_contracts"; referencedColumns: ["id"] }
        ]
      }
      standard_interest_rates: {
        Row: AsRow<StandardInterestRate>
        Insert: Partial<Omit<StandardInterestRate, 'id' | 'created_at'>>
        Update: Partial<Omit<StandardInterestRate, 'id' | 'created_at'>>
        Relationships: []
      }
      audit_logs: {
        Row: AsRow<AuditLog>
        Insert: Partial<Omit<AuditLog, 'id' | 'created_at'>>
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      my_organization_id: { Args: Record<never, never>; Returns: string }
      my_role: { Args: Record<never, never>; Returns: string }
      next_entry_number: { Args: { p_org_id: string; p_year: number }; Returns: string }
      seed_chart_of_accounts: { Args: { p_org_id: string }; Returns: void }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// ── Domain Types ──────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  business_number: string | null
  owner_name: string
  email: string
  phone: string | null
  address: string | null
  rental_type: RentalType
  subscription_plan: SubscriptionPlan
  subscription_expires_at: string | null
  fiscal_year_start_month: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  organization_id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  organization_id: string
  name: string          // computed: building_name + (unit_number ? ' ' + unit_number : '')
  building_name: string // 건물명
  unit_number: string   // 호실
  property_type: PropertyType
  rental_tax_type: '과세' | '면세'
  address_road: string
  address_detail: string | null
  sido: string | null
  sigungu: string | null
  land_area: number | null
  building_area: number | null
  floors: number | null
  acquisition_date: string
  acquisition_cost: number
  land_value: number | null
  building_value: number | null
  useful_life: number
  depreciation_method: DepreciationMethod
  salvage_value: number
  registration_number: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeaseContract {
  id: string
  organization_id: string
  property_id: string
  contract_number: string
  contract_date: string | null
  lessee_name: string
  lessee_id_number: string | null
  lessee_phone: string | null
  lessee_email: string | null
  contract_type: ContractType
  start_date: string
  end_date: string
  deposit_amount: number
  monthly_rent: number
  monthly_management_fee: number | null
  vat_included: boolean
  payment_due_day: number
  auto_renewal: boolean
  auto_journal_rent: boolean
  auto_journal_mgmt: boolean
  status: ContractStatus
  termination_date: string | null
  termination_reason: string | null
  special_terms: string | null
  notes: string | null
  attachment_urls?: string[] | null
  created_at: string
  updated_at: string
}

export interface DepositTransaction {
  id: string
  organization_id: string
  contract_id: string
  transaction_type: DepositTransactionType
  amount: number
  transaction_date: string
  bank_account: string | null
  journal_entry_id: string | null
  notes: string | null
  created_at: string
}

export interface RentTransaction {
  id: string
  organization_id: string
  contract_id: string
  transaction_type: '임대료' | '관리비' | '연체료' | '선수임대료'
  billing_year: number
  billing_month: number
  due_date: string
  amount: number
  vat_amount: number
  paid_amount: number
  paid_date: string | null
  payment_method: string | null
  status: RentStatus
  journal_entry_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ChartOfAccount {
  id: string
  organization_id: string
  code: string
  name: string
  account_type: AccountType
  account_subtype: string | null
  parent_id: string | null
  normal_balance: NormalBalance
  is_system: boolean
  is_active: boolean
  description: string | null
  created_at: string
}

export interface FiscalYear {
  id: string
  organization_id: string
  year: number
  start_date: string
  end_date: string
  is_closed: boolean
  closed_at: string | null
  closed_by: string | null
  created_at: string
}

export interface Vendor {
  id: string
  organization_id: string
  name: string
  business_number: string | null
  memo: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  organization_id: string
  fiscal_year_id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: JournalEntryType
  vendor_id: string | null
  evidence_type: EvidenceType | null
  reference_id: string | null
  reference_type: string | null
  status: JournalEntryStatus
  is_reversed: boolean
  reversed_by: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  attachment_urls?: string[] | null
  created_at: string
  updated_at: string
  // Joins
  lines?: JournalEntryLine[]
  vendor?: Vendor | null
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  organization_id: string
  account_id: string
  debit_amount: number
  credit_amount: number
  description: string | null
  property_id: string | null
  contract_id: string | null
  line_order: number
  created_at: string
  // Joins
  account?: ChartOfAccount
}

export interface DepreciationSchedule {
  id: string
  organization_id: string
  property_id: string
  fiscal_year: number
  period_month: number
  depreciable_cost: number
  depreciation_rate: number | null
  depreciation_amount: number
  accumulated_depreciation: number
  book_value: number
  journal_entry_id: string | null
  is_processed: boolean
  processed_at: string | null
  created_at: string
}

export interface DeemedRentalCalculation {
  id: string
  organization_id: string
  contract_id: string
  fiscal_year: number
  calculation_period_start: string
  calculation_period_end: string
  deposit_amount: number
  standard_rate: number
  rental_days: number
  deemed_income: number
  tax_exempt_threshold: number | null
  taxable_deemed_income: number
  journal_entry_id: string | null
  is_processed: boolean
  notes: string | null
  created_at: string
}

export interface StandardInterestRate {
  id: string
  effective_year: number
  rate: number
  announced_by: string
  source_reference: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_values: Json | null
  new_values: Json | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// ── View / Computed Types ─────────────────────────────────

export interface TrialBalanceRow {
  account_code: string
  account_name: string
  account_type: AccountType
  debit_total: number
  credit_total: number
  balance: number
}

export interface FinancialStatementLine {
  code: string
  name: string
  account_type: AccountType
  amount: number
  children?: FinancialStatementLine[]
}

export interface DashboardStats {
  total_properties: number
  active_contracts: number
  monthly_rental_income: number
  unpaid_rent_amount: number
  total_deposit: number
  occupancy_rate: number
}
