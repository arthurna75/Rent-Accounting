-- 임대계약 테이블에 신규 컬럼 추가
ALTER TABLE public.lease_contracts
  ADD COLUMN IF NOT EXISTS contract_date DATE,
  ADD COLUMN IF NOT EXISTS auto_journal_rent  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_journal_mgmt  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lease_contracts.contract_date      IS '계약 체결일';
COMMENT ON COLUMN public.lease_contracts.auto_journal_rent  IS '월세 수입 자동 분개 여부';
COMMENT ON COLUMN public.lease_contracts.auto_journal_mgmt  IS '관리비 수입 자동 분개 여부';
