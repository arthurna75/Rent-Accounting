-- ============================================================
-- journal_entries DELETE 정책 추가 + FK ON DELETE SET NULL
-- Migration: 20260624000002
-- ============================================================

-- 1. journal_entries 테이블에 DELETE 정책 추가
--    (기존에 없어서 헤더 삭제가 조용히 실패하던 문제 수정)
create policy "je_delete" on public.journal_entries
  for delete to authenticated
  using (
    organization_id = public.my_organization_id()
    and public.my_role() in ('owner', 'accountant')
  );

-- 2. deposit_transactions, rent_transactions의 journal_entry_id FK를
--    ON DELETE SET NULL로 변경 (전표 삭제 시 자동으로 null 처리)
alter table public.deposit_transactions
  drop constraint if exists fk_deposit_journal;

alter table public.deposit_transactions
  add constraint fk_deposit_journal
  foreign key (journal_entry_id) references public.journal_entries(id)
  on delete set null;

alter table public.rent_transactions
  drop constraint if exists fk_rent_journal;

alter table public.rent_transactions
  add constraint fk_rent_journal
  foreign key (journal_entry_id) references public.journal_entries(id)
  on delete set null;
