# API 설계 문서

## 기본 규칙
- Base URL: `/api`
- 인증: Supabase Session Cookie (미들웨어에서 자동 처리)
- 응답 형식: `{ data: T }` 또는 `{ error: string }`
- 페이지네이션: `{ data, pagination: { page, limit, total, pages } }`
- 날짜 형식: `YYYY-MM-DD`

## 엔드포인트 목록

### 부동산 (Properties)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/properties` | 부동산 목록 (페이지네이션, 필터) | 전체 |
| POST | `/api/properties` | 부동산 등록 | owner, accountant |
| GET | `/api/properties/:id` | 부동산 상세 (계약 포함) | 전체 |
| PATCH | `/api/properties/:id` | 부동산 정보 수정 | owner, accountant |
| DELETE | `/api/properties/:id` | 부동산 비활성화 (soft delete) | owner |

**Query Params:**
- `type`: 부동산 유형 필터
- `is_active`: 활성화 여부
- `page`, `limit`: 페이지네이션

---

### 임대차계약 (Lease Contracts)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/contracts` | 계약 목록 | 전체 |
| POST | `/api/contracts` | 계약 등록 | owner, accountant |
| GET | `/api/contracts/:id` | 계약 상세 + 보증금/임대료 거래 | 전체 |
| PATCH | `/api/contracts/:id` | 계약 수정 | owner, accountant |
| DELETE | `/api/contracts/:id` | 계약 해지 (status: terminated) | owner |
| POST | `/api/contracts/:id/renew` | 계약 갱신 | owner, accountant |
| POST | `/api/contracts/:id/deposit` | 보증금 거래 등록 + 자동 분개 | owner, accountant |
| POST | `/api/contracts/:id/rent` | 임대료 수납 처리 + 자동 분개 | owner, accountant |

**Request Body (POST /api/contracts):**
```json
{
  "property_id": "uuid",
  "contract_number": "C-2026-001",
  "lessee_name": "홍길동",
  "contract_type": "월세",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "deposit_amount": 10000000,
  "monthly_rent": 500000,
  "vat_included": false,
  "payment_due_day": 1
}
```

---

### 분개 (Journal Entries)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/accounting/journal-entries` | 분개장 조회 | 전체 |
| POST | `/api/accounting/journal-entries` | 수동 전표 등록 | owner, accountant |
| GET | `/api/accounting/journal-entries/:id` | 전표 상세 | 전체 |
| POST | `/api/accounting/journal-entries/:id/approve` | 전표 승인 | owner |
| POST | `/api/accounting/journal-entries/:id/reverse` | 역분개 | owner |

**Query Params:**
- `status`: draft / posted / reversed
- `entry_type`: 거래 유형
- `from_date`, `to_date`: 날짜 범위

**Request Body (POST 분개):**
```json
{
  "entry_date": "2026-06-01",
  "description": "임대료 수령 - 홍길동",
  "entry_type": "임대수익",
  "auto_post": false,
  "lines": [
    { "account_code": "102", "debit_amount": 500000, "credit_amount": 0 },
    { "account_code": "510", "debit_amount": 0, "credit_amount": 500000 }
  ]
}
```

---

### 감가상각 (Depreciation)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/accounting/depreciation` | 감가상각 스케줄 조회 | 전체 |
| POST | `/api/accounting/depreciation` | 월별 감가상각 자동 처리 | owner, accountant |

**Request Body (POST):**
```json
{
  "year": 2026,
  "month": 6,
  "property_ids": ["uuid1", "uuid2"]  // 생략 시 전체
}
```

---

### 간주임대료 (Deemed Rental)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/accounting/deemed-rental` | 간주임대료 계산 목록 | 전체 |
| POST | `/api/accounting/deemed-rental` | 연간 간주임대료 계산 + 저장 | owner, accountant |

**Request Body (POST):**
```json
{
  "year": 2026,
  "create_journal": true  // 분개 자동 생성 여부
}
```

---

### 보고서 (Reports)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/reports/balance-sheet` | 재무상태표 | 전체 |
| GET | `/api/reports/income-statement` | 손익계산서 | 전체 |
| GET | `/api/reports/trial-balance` | 시산표 | owner, accountant |
| GET | `/api/reports/rental-income` | 임대수익 명세서 | 전체 |
| GET | `/api/reports/cash-flow` | 현금흐름표 | 전체 |

**Query Params (balance-sheet):** `?date=2026-12-31`

**Query Params (income-statement):** `?year=2026&month=6` (month 생략 시 연간)

---

### 계정과목 (Chart of Accounts)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/accounting/chart-of-accounts` | 계정과목 목록 | 전체 |
| POST | `/api/accounting/chart-of-accounts` | 계정과목 추가 | owner, accountant |
| PATCH | `/api/accounting/chart-of-accounts/:id` | 수정 (is_system=false만) | owner, accountant |

---

## 에러 코드

| HTTP | Code | 설명 |
|------|------|------|
| 401 | Unauthorized | 미인증 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 422 | Unprocessable | 유효성 검사 실패 |
| 400 | Bad Request | 복식회계 불균형 등 비즈니스 규칙 위반 |
| 500 | Internal Server Error | 서버 오류 |
