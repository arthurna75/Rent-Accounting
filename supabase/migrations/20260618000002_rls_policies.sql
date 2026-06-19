-- ============================================================
-- Row Level Security Policies
-- Migration: 20260618000002
-- ============================================================

-- Helper function: 현재 사용자의 organization_id 반환
create or replace function public.my_organization_id()
returns uuid language sql stable security definer as $$
  select organization_id
  from public.user_profiles
  where id = auth.uid()
  limit 1;
$$;

-- Helper function: 현재 사용자의 역할 반환
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role
  from public.user_profiles
  where id = auth.uid()
  limit 1;
$$;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create policy "org_select" on public.organizations
  for select to authenticated
  using (id = public.my_organization_id());

create policy "org_update" on public.organizations
  for update to authenticated
  using (id = public.my_organization_id() and public.my_role() = 'owner')
  with check (id = public.my_organization_id());

-- ============================================================
-- USER_PROFILES
-- ============================================================
create policy "profile_select" on public.user_profiles
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "profile_insert_owner" on public.user_profiles
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() = 'owner'
  );

create policy "profile_update_own" on public.user_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profile_update_owner" on public.user_profiles
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() = 'owner'
  );

-- ============================================================
-- PROPERTIES
-- ============================================================
create policy "props_select" on public.properties
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "props_insert" on public.properties
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "props_update" on public.properties
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "props_delete" on public.properties
  for delete to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() = 'owner'
  );

-- ============================================================
-- LEASE_CONTRACTS
-- ============================================================
create policy "contracts_select" on public.lease_contracts
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "contracts_insert" on public.lease_contracts
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "contracts_update" on public.lease_contracts
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "contracts_delete" on public.lease_contracts
  for delete to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() = 'owner'
  );

-- ============================================================
-- DEPOSIT_TRANSACTIONS
-- ============================================================
create policy "deposits_select" on public.deposit_transactions
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "deposits_insert" on public.deposit_transactions
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

-- ============================================================
-- RENT_TRANSACTIONS
-- ============================================================
create policy "rent_tx_select" on public.rent_transactions
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "rent_tx_insert" on public.rent_transactions
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "rent_tx_update" on public.rent_transactions
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

-- ============================================================
-- CHART_OF_ACCOUNTS
-- ============================================================
create policy "coa_select" on public.chart_of_accounts
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "coa_insert" on public.chart_of_accounts
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "coa_update" on public.chart_of_accounts
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
    and is_system = false
  );

-- ============================================================
-- FISCAL_YEARS
-- ============================================================
create policy "fy_select" on public.fiscal_years
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "fy_insert" on public.fiscal_years
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "fy_update" on public.fiscal_years
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() = 'owner'
  );

-- ============================================================
-- JOURNAL_ENTRIES
-- ============================================================
create policy "je_select" on public.journal_entries
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "je_insert" on public.journal_entries
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "je_update_draft" on public.journal_entries
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and status = 'draft'
    and public.my_role() in ('owner','accountant')
  );

-- posted 전표는 owner만 역분개 가능 (update 제한)
create policy "je_reverse" on public.journal_entries
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() = 'owner'
  );

-- ============================================================
-- JOURNAL_ENTRY_LINES
-- ============================================================
create policy "jel_select" on public.journal_entry_lines
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "jel_insert" on public.journal_entry_lines
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "jel_update" on public.journal_entry_lines
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "jel_delete" on public.journal_entry_lines
  for delete to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

-- ============================================================
-- DEPRECIATION_SCHEDULES
-- ============================================================
create policy "depr_select" on public.depreciation_schedules
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "depr_insert" on public.depreciation_schedules
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

create policy "depr_update" on public.depreciation_schedules
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

-- ============================================================
-- DEEMED_RENTAL_CALCULATIONS
-- ============================================================
create policy "deemed_select" on public.deemed_rental_calculations
  for select to authenticated
  using (organization_id = public.my_organization_id());

create policy "deemed_insert" on public.deemed_rental_calculations
  for insert to authenticated
  with check (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner','accountant')
  );

-- ============================================================
-- AUDIT_LOGS — 읽기 전용 (owner만)
-- ============================================================
create policy "audit_select" on public.audit_logs
  for select to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() = 'owner'
  );
