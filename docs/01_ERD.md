# 임대사업자 복식회계 SaaS — ERD

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USER_PROFILES : "has"
    ORGANIZATIONS ||--o{ PROPERTIES : "owns"
    ORGANIZATIONS ||--o{ LEASE_CONTRACTS : "manages"
    ORGANIZATIONS ||--o{ CHART_OF_ACCOUNTS : "uses"
    ORGANIZATIONS ||--o{ FISCAL_YEARS : "has"
    ORGANIZATIONS ||--o{ JOURNAL_ENTRIES : "records"
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "tracks"

    PROPERTIES ||--o{ LEASE_CONTRACTS : "rented via"
    PROPERTIES ||--o{ DEPRECIATION_SCHEDULES : "depreciated by"
    PROPERTIES ||--o{ JOURNAL_ENTRY_LINES : "tracked in"

    LEASE_CONTRACTS ||--o{ DEPOSIT_TRANSACTIONS : "has"
    LEASE_CONTRACTS ||--o{ RENT_TRANSACTIONS : "generates"
    LEASE_CONTRACTS ||--o{ DEEMED_RENTAL_CALCULATIONS : "computed for"
    LEASE_CONTRACTS ||--o{ JOURNAL_ENTRY_LINES : "tracked in"

    JOURNAL_ENTRIES ||--o{ JOURNAL_ENTRY_LINES : "consists of"
    JOURNAL_ENTRIES ||--o| JOURNAL_ENTRIES : "reversed_by"

    CHART_OF_ACCOUNTS ||--o{ JOURNAL_ENTRY_LINES : "posted to"
    CHART_OF_ACCOUNTS ||--o{ CHART_OF_ACCOUNTS : "parent_of"

    FISCAL_YEARS ||--o{ JOURNAL_ENTRIES : "contains"

    ORGANIZATIONS {
        uuid id PK
        text name
        text business_number UK
        text owner_name
        text email
        text rental_type
        text subscription_plan
        int  fiscal_year_start_month
        timestamptz created_at
    }

    USER_PROFILES {
        uuid id PK_FK
        uuid organization_id FK
        text full_name
        text role
    }

    PROPERTIES {
        uuid id PK
        uuid organization_id FK
        text name
        text property_type
        text rental_type
        text address_road
        date acquisition_date
        numeric acquisition_cost
        numeric land_value
        numeric building_value
        int  useful_life
        text depreciation_method
        bool is_active
    }

    LEASE_CONTRACTS {
        uuid id PK
        uuid organization_id FK
        uuid property_id FK
        text contract_number UK
        text lessee_name
        text contract_type
        date start_date
        date end_date
        numeric deposit_amount
        numeric monthly_rent
        numeric monthly_management_fee
        bool vat_included
        int  payment_due_day
        text status
    }

    DEPOSIT_TRANSACTIONS {
        uuid id PK
        uuid organization_id FK
        uuid contract_id FK
        text transaction_type
        numeric amount
        date transaction_date
        uuid journal_entry_id FK
    }

    RENT_TRANSACTIONS {
        uuid id PK
        uuid organization_id FK
        uuid contract_id FK
        text transaction_type
        int  billing_year
        int  billing_month
        date due_date
        numeric amount
        numeric vat_amount
        numeric paid_amount
        date paid_date
        text status
        uuid journal_entry_id FK
    }

    CHART_OF_ACCOUNTS {
        uuid id PK
        uuid organization_id FK
        text code UK
        text name
        text account_type
        text account_subtype
        uuid parent_id FK
        text normal_balance
        bool is_system
        bool is_active
    }

    FISCAL_YEARS {
        uuid id PK
        uuid organization_id FK
        int  year
        date start_date
        date end_date
        bool is_closed
    }

    JOURNAL_ENTRIES {
        uuid id PK
        uuid organization_id FK
        uuid fiscal_year_id FK
        text entry_number UK
        date entry_date
        text description
        text entry_type
        uuid reference_id
        text reference_type
        text status
        uuid reversed_by FK
        uuid created_by FK
    }

    JOURNAL_ENTRY_LINES {
        uuid id PK
        uuid journal_entry_id FK
        uuid organization_id FK
        uuid account_id FK
        numeric debit_amount
        numeric credit_amount
        uuid property_id FK
        uuid contract_id FK
        int  line_order
    }

    DEPRECIATION_SCHEDULES {
        uuid id PK
        uuid organization_id FK
        uuid property_id FK
        int  fiscal_year
        int  period_month
        numeric depreciable_cost
        numeric depreciation_amount
        numeric accumulated_depreciation
        numeric book_value
        uuid journal_entry_id FK
        bool is_processed
    }

    DEEMED_RENTAL_CALCULATIONS {
        uuid id PK
        uuid organization_id FK
        uuid contract_id FK
        int  fiscal_year
        date calculation_period_start
        date calculation_period_end
        numeric deposit_amount
        numeric standard_rate
        int  rental_days
        numeric deemed_income
        numeric taxable_deemed_income
        uuid journal_entry_id FK
        bool is_processed
    }

    AUDIT_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        text action
        text table_name
        uuid record_id
        jsonb old_values
        jsonb new_values
        inet ip_address
        timestamptz created_at
    }

    STANDARD_INTEREST_RATES {
        uuid id PK
        int  effective_year UK
        numeric rate
        text announced_by
    }
```

## 계정과목 체계 (Chart of Accounts)

| 코드 | 계정명 | 유형 | 잔액방향 |
|------|--------|------|---------|
| 101 | 현금 | 자산 | 차변 |
| 102 | 보통예금 | 자산 | 차변 |
| 103 | 당좌예금 | 자산 | 차변 |
| 110 | 미수임대료 | 자산 | 차변 |
| 115 | 선급비용 | 자산 | 차변 |
| 200 | 건물 | 자산 | 차변 |
| 201 | 건물감가상각누계액 | 자산(차감) | 대변 |
| 210 | 토지 | 자산 | 차변 |
| 220 | 시설장치 | 자산 | 차변 |
| 221 | 시설장치감가상각누계액 | 자산(차감) | 대변 |
| 310 | 임대보증금 | 부채 | 대변 |
| 320 | 미지급비용 | 부채 | 대변 |
| 330 | 선수임대료 | 부채 | 대변 |
| 340 | 예수부가가치세 | 부채 | 대변 |
| 350 | 미지급세금 | 부채 | 대변 |
| 410 | 자본금 | 자본 | 대변 |
| 420 | 이익잉여금 | 자본 | 대변 |
| 510 | 임대수익 | 수익 | 대변 |
| 511 | 간주임대료수익 | 수익 | 대변 |
| 520 | 관리비수익 | 수익 | 대변 |
| 610 | 감가상각비 | 비용 | 차변 |
| 620 | 수선유지비 | 비용 | 차변 |
| 630 | 보험료 | 비용 | 차변 |
| 640 | 재산세 | 비용 | 차변 |
| 650 | 이자비용 | 비용 | 차변 |
| 660 | 세무사수수료 | 비용 | 차변 |
| 670 | 기타비용 | 비용 | 차변 |

## 핵심 분개 패턴

| 거래 | 차변 | 대변 |
|------|------|------|
| 월세 수령 (주택) | 보통예금 | 임대수익 |
| 월세 수령 (상가 부가세 포함) | 보통예금 | 임대수익 + 예수부가가치세 |
| 보증금 수령 | 보통예금 | 임대보증금 |
| 보증금 반환 | 임대보증금 | 보통예금 |
| 월 감가상각 | 감가상각비 | 건물감가상각누계액 |
| 간주임대료 계상 | 미수간주임대료 | 간주임대료수익 |
| 미수임대료 계상 | 미수임대료 | 임대수익 |
| 미수임대료 회수 | 보통예금 | 미수임대료 |
