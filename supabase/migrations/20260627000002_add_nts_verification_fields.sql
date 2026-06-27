-- 국세청 세금계산서/현금영수증 발행번호 및 검증 이력 컬럼 추가
ALTER TABLE journal_entries
  ADD COLUMN nts_approval_number       TEXT,
  ADD COLUMN nts_verified              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN nts_verified_at           TIMESTAMPTZ,
  ADD COLUMN nts_verification_result   JSONB;
