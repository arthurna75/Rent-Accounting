-- 계정과목 CRUD 권한 확장
-- 1. 기존 update 정책 교체: 시스템 계정도 is_active 토글 가능하도록
-- 2. delete 정책 신규 추가: 비시스템 계정만 삭제 가능

drop policy if exists "coa_update" on public.chart_of_accounts;

-- owner/accountant 는 자기 조직 계정과목 업데이트 가능
-- (시스템 계정에 대한 필드 제한은 API 레이어에서 enforced)
create policy "coa_update" on public.chart_of_accounts
  for update to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner', 'accountant')
  )
  with check (
    organization_id = public.my_organization_id()
  );

-- 비시스템 계정만 삭제 가능
create policy "coa_delete" on public.chart_of_accounts
  for delete to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner', 'accountant')
    and is_system = false
  );
