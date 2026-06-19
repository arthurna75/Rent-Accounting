-- ============================================================
-- 임대사업자 복식회계 SaaS — Initial Schema
-- Migration: 20260618000001
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS (SaaS 테넌트 = 임대사업자)
-- ============================================================
create table public.organizations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  business_number         text unique,                    -- 사업자등록번호
  owner_name              text not null,
  email                   text not null unique,
  phone                   text,
  address                 text,
  rental_type             text not null default '주택'
                            check (rental_type in ('주택','상가','혼합')),
  subscription_plan       text not null default 'basic'
                            check (subscription_plan in ('basic','pro','enterprise')),
  subscription_expires_at timestamptz,
  fiscal_year_start_month int  not null default 1
                            check (fiscal_year_start_month between 1 and 12),
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- ============================================================
-- USER_PROFILES
-- ============================================================
create table public.user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name       text not null,
  role            text not null default 'owner'
                    check (role in ('owner','accountant','viewer')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.user_profiles enable row level security;

-- ============================================================
-- PROPERTIES (부동산)
-- ============================================================
create table public.properties (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  property_type       text not null
                        check (property_type in ('아파트','다세대','단독주택','상가','오피스텔','근린생활시설','기타')),
  rental_tax_type     text not null default '면세'
                        check (rental_tax_type in ('과세','면세')),     -- 상가=과세, 주택=면세
  address_road        text not null,
  address_detail      text,
  sido                text,
  sigungu             text,
  land_area           numeric(10,2),                                   -- 토지면적(㎡)
  building_area       numeric(10,2),                                   -- 건물면적(㎡)
  floors              int,
  acquisition_date    date not null,
  acquisition_cost    numeric(15,2) not null,                          -- 취득가액
  land_value          numeric(15,2),                                   -- 토지가액 (불변)
  building_value      numeric(15,2),                                   -- 건물가액 (감가상각 대상)
  useful_life         int  not null default 40,                        -- 내용연수(년)
  depreciation_method text not null default '정액법'
                        check (depreciation_method in ('정액법','정률법')),
  salvage_value       numeric(15,2) not null default 0,               -- 잔존가액
  registration_number text,                                            -- 등기번호
  is_active           boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.properties enable row level security;

-- ============================================================
-- LEASE_CONTRACTS (임대차계약)
-- ============================================================
create table public.lease_contracts (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  property_id          uuid not null references public.properties(id),
  contract_number      text not null,
  lessee_name          text not null,
  lessee_id_number     text,                    -- 주민/사업자번호 (암호화 권장)
  lessee_phone         text,
  lessee_email         text,
  contract_type        text not null
                         check (contract_type in ('월세','전세','반전세')),
  start_date           date not null,
  end_date             date not null,
  deposit_amount       numeric(15,2) not null default 0,
  monthly_rent         numeric(15,2) not null default 0,
  monthly_management_fee numeric(15,2) default 0,
  vat_included         boolean not null default false,
  payment_due_day      int  not null default 1
                         check (payment_due_day between 1 and 31),
  auto_renewal         boolean not null default false,
  status               text not null default 'active'
                         check (status in ('draft','active','expired','terminated')),
  termination_date     date,
  termination_reason   text,
  special_terms        text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uk_contract_number unique (organization_id, contract_number),
  constraint chk_dates check (end_date > start_date)
);
alter table public.lease_contracts enable row level security;

-- ============================================================
-- DEPOSIT_TRANSACTIONS (보증금 거래)
-- ============================================================
create table public.deposit_transactions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  contract_id      uuid not null references public.lease_contracts(id),
  transaction_type text not null
                     check (transaction_type in ('수령','반환','부분반환','증액','감액')),
  amount           numeric(15,2) not null check (amount >= 0),
  transaction_date date not null,
  bank_account     text,
  journal_entry_id uuid,                        -- FK 추가 (journal_entries 생성 후)
  notes            text,
  created_at       timestamptz not null default now()
);
alter table public.deposit_transactions enable row level security;

-- ============================================================
-- RENT_TRANSACTIONS (임대료 거래)
-- ============================================================
create table public.rent_transactions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  contract_id      uuid not null references public.lease_contracts(id),
  transaction_type text not null default '임대료'
                     check (transaction_type in ('임대료','관리비','연체료','선수임대료')),
  billing_year     int  not null,
  billing_month    int  not null check (billing_month between 1 and 12),
  due_date         date not null,
  amount           numeric(15,2) not null check (amount >= 0),
  vat_amount       numeric(15,2) not null default 0,
  paid_amount      numeric(15,2) not null default 0,
  paid_date        date,
  payment_method   text,
  status           text not null default 'unpaid'
                     check (status in ('unpaid','partial','paid','overdue','waived')),
  journal_entry_id uuid,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint uk_rent_billing unique (contract_id, transaction_type, billing_year, billing_month)
);
alter table public.rent_transactions enable row level security;

-- ============================================================
-- CHART_OF_ACCOUNTS (계정과목)
-- ============================================================
create table public.chart_of_accounts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code            text not null,
  name            text not null,
  account_type    text not null
                    check (account_type in ('자산','부채','자본','수익','비용')),
  account_subtype text,                         -- 유동자산, 비유동자산, 유동부채, …
  parent_id       uuid references public.chart_of_accounts(id),
  normal_balance  text not null
                    check (normal_balance in ('차변','대변')),
  is_system       boolean not null default false,
  is_active       boolean not null default true,
  description     text,
  created_at      timestamptz not null default now(),
  constraint uk_account_code unique (organization_id, code)
);
alter table public.chart_of_accounts enable row level security;

-- ============================================================
-- FISCAL_YEARS (회계연도)
-- ============================================================
create table public.fiscal_years (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year            int  not null,
  start_date      date not null,
  end_date        date not null,
  is_closed       boolean not null default false,
  closed_at       timestamptz,
  closed_by       uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  constraint uk_fiscal_year unique (organization_id, year),
  constraint chk_fiscal_dates check (end_date > start_date)
);
alter table public.fiscal_years enable row level security;

-- ============================================================
-- JOURNAL_ENTRIES (분개/전표)
-- ============================================================
create table public.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fiscal_year_id  uuid not null references public.fiscal_years(id),
  entry_number    text not null,
  entry_date      date not null,
  description     text not null,
  entry_type      text not null default '일반'
                    check (entry_type in (
                      '일반','임대수익','보증금수령','보증금반환',
                      '감가상각','간주임대료','세금','관리비'
                    )),
  reference_id    uuid,
  reference_type  text,
  status          text not null default 'draft'
                    check (status in ('draft','posted','reversed')),
  is_reversed     boolean not null default false,
  reversed_by     uuid references public.journal_entries(id),
  created_by      uuid references auth.users(id),
  approved_by     uuid references auth.users(id),
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint uk_entry_number unique (organization_id, entry_number)
);
alter table public.journal_entries enable row level security;

-- ============================================================
-- JOURNAL_ENTRY_LINES (분개명세)
-- ============================================================
create table public.journal_entry_lines (
  id               uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  account_id       uuid not null references public.chart_of_accounts(id),
  debit_amount     numeric(15,2) not null default 0 check (debit_amount >= 0),
  credit_amount    numeric(15,2) not null default 0 check (credit_amount >= 0),
  description      text,
  property_id      uuid references public.properties(id),
  contract_id      uuid references public.lease_contracts(id),
  line_order       int  not null default 0,
  created_at       timestamptz not null default now(),
  constraint chk_debit_or_credit check (
    (debit_amount > 0 and credit_amount = 0) or
    (credit_amount > 0 and debit_amount = 0) or
    (debit_amount = 0 and credit_amount = 0)
  )
);
alter table public.journal_entry_lines enable row level security;

-- ============================================================
-- DEPRECIATION_SCHEDULES (감가상각 스케줄)
-- ============================================================
create table public.depreciation_schedules (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  property_id              uuid not null references public.properties(id),
  fiscal_year              int  not null,
  period_month             int  not null check (period_month between 1 and 12),
  depreciable_cost         numeric(15,2) not null,
  depreciation_rate        numeric(10,8),
  depreciation_amount      numeric(15,2) not null,
  accumulated_depreciation numeric(15,2) not null,
  book_value               numeric(15,2) not null,
  journal_entry_id         uuid references public.journal_entries(id),
  is_processed             boolean not null default false,
  processed_at             timestamptz,
  created_at               timestamptz not null default now(),
  constraint uk_depreciation_period unique (property_id, fiscal_year, period_month)
);
alter table public.depreciation_schedules enable row level security;

-- ============================================================
-- DEEMED_RENTAL_CALCULATIONS (간주임대료 계산)
-- ============================================================
create table public.deemed_rental_calculations (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  contract_id              uuid not null references public.lease_contracts(id),
  fiscal_year              int  not null,
  calculation_period_start date not null,
  calculation_period_end   date not null,
  deposit_amount           numeric(15,2) not null,
  standard_rate            numeric(8,6) not null,
  rental_days              int  not null,
  deemed_income            numeric(15,2) not null,
  tax_exempt_threshold     numeric(15,2) default 300000000,  -- 3억
  taxable_deemed_income    numeric(15,2) not null,
  journal_entry_id         uuid references public.journal_entries(id),
  is_processed             boolean not null default false,
  notes                    text,
  created_at               timestamptz not null default now()
);
alter table public.deemed_rental_calculations enable row level security;

-- ============================================================
-- STANDARD_INTEREST_RATES (기준이율 — 간주임대료용)
-- ============================================================
create table public.standard_interest_rates (
  id              uuid primary key default gen_random_uuid(),
  effective_year  int  not null unique,
  rate            numeric(8,6) not null,       -- 0.029 = 2.9%
  announced_by    text not null default '국세청',
  source_reference text,
  created_at      timestamptz not null default now()
);
-- 공개 테이블 (모든 인증 사용자 읽기 가능)
alter table public.standard_interest_rates enable row level security;
create policy "Anyone authenticated can read rates"
  on public.standard_interest_rates for select
  to authenticated using (true);

-- ============================================================
-- AUDIT_LOGS (감사로그)
-- ============================================================
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id         uuid references auth.users(id),
  action          text not null,               -- INSERT, UPDATE, DELETE, LOGIN, EXPORT
  table_name      text not null,
  record_id       uuid,
  old_values      jsonb,
  new_values      jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

-- ============================================================
-- FK 추가 (순환참조 해소 후)
-- ============================================================
alter table public.deposit_transactions
  add constraint fk_deposit_journal
  foreign key (journal_entry_id) references public.journal_entries(id);

alter table public.rent_transactions
  add constraint fk_rent_journal
  foreign key (journal_entry_id) references public.journal_entries(id);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_user_profiles_org   on public.user_profiles(organization_id);
create index idx_properties_org      on public.properties(organization_id);
create index idx_contracts_org       on public.lease_contracts(organization_id);
create index idx_contracts_property  on public.lease_contracts(property_id);
create index idx_contracts_status    on public.lease_contracts(status);
create index idx_rent_tx_contract    on public.rent_transactions(contract_id);
create index idx_rent_tx_status      on public.rent_transactions(status);
create index idx_journal_entries_org on public.journal_entries(organization_id);
create index idx_journal_entries_date on public.journal_entries(entry_date);
create index idx_journal_lines_entry on public.journal_entry_lines(journal_entry_id);
create index idx_journal_lines_acct  on public.journal_entry_lines(account_id);
create index idx_depr_property       on public.depreciation_schedules(property_id);
create index idx_audit_org_date      on public.audit_logs(organization_id, created_at desc);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create trigger trg_contracts_updated_at
  before update on public.lease_contracts
  for each row execute function public.set_updated_at();

create trigger trg_rent_tx_updated_at
  before update on public.rent_transactions
  for each row execute function public.set_updated_at();

create trigger trg_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ============================================================
-- DOUBLE-ENTRY INTEGRITY CHECK FUNCTION
-- ============================================================
create or replace function public.check_journal_balance()
returns trigger language plpgsql as $$
declare
  v_total_debit  numeric;
  v_total_credit numeric;
begin
  select
    coalesce(sum(debit_amount), 0),
    coalesce(sum(credit_amount), 0)
  into v_total_debit, v_total_credit
  from public.journal_entry_lines
  where journal_entry_id = new.journal_entry_id;

  -- posted 상태일 때만 밸런스 체크
  if exists (
    select 1 from public.journal_entries
    where id = new.journal_entry_id and status = 'posted'
  ) then
    if v_total_debit != v_total_credit then
      raise exception
        '복식회계 불균형: 차변(%) ≠ 대변(%) — journal_entry_id: %',
        v_total_debit, v_total_credit, new.journal_entry_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_check_journal_balance
  after insert or update on public.journal_entry_lines
  for each row execute function public.check_journal_balance();

-- ============================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================
create or replace function public.log_audit()
returns trigger language plpgsql security definer as $$
declare
  v_org_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if TG_OP = 'DELETE' then
    v_org_id := old.organization_id;
    insert into public.audit_logs(organization_id, user_id, action, table_name, record_id, old_values)
    values (v_org_id, v_user_id, 'DELETE', TG_TABLE_NAME, old.id, to_jsonb(old));
    return old;
  elsif TG_OP = 'UPDATE' then
    v_org_id := new.organization_id;
    insert into public.audit_logs(organization_id, user_id, action, table_name, record_id, old_values, new_values)
    values (v_org_id, v_user_id, 'UPDATE', TG_TABLE_NAME, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif TG_OP = 'INSERT' then
    v_org_id := new.organization_id;
    insert into public.audit_logs(organization_id, user_id, action, table_name, record_id, new_values)
    values (v_org_id, v_user_id, 'INSERT', TG_TABLE_NAME, new.id, to_jsonb(new));
    return new;
  end if;
end;
$$;

-- 핵심 테이블에 감사로그 트리거 적용
create trigger trg_audit_properties
  after insert or update or delete on public.properties
  for each row execute function public.log_audit();

create trigger trg_audit_contracts
  after insert or update or delete on public.lease_contracts
  for each row execute function public.log_audit();

create trigger trg_audit_journal_entries
  after insert or update or delete on public.journal_entries
  for each row execute function public.log_audit();

-- ============================================================
-- ENTRY NUMBER SEQUENCE FUNCTION
-- ============================================================
create or replace function public.next_entry_number(p_org_id uuid, p_year int)
returns text language plpgsql as $$
declare
  v_seq int;
begin
  select coalesce(max(
    cast(substring(entry_number from '[0-9]+$') as int)
  ), 0) + 1
  into v_seq
  from public.journal_entries
  where organization_id = p_org_id
    and extract(year from entry_date) = p_year;

  return p_year::text || '-' || lpad(v_seq::text, 6, '0');
end;
$$;
