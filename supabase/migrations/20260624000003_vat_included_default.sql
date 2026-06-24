-- 기존 계약 중 vat_included = false 인 건을 모두 true로 업데이트
-- (부가세 포함을 전체 계약 기본값으로 적용)
UPDATE public.lease_contracts
SET vat_included = true
WHERE vat_included = false;

-- 이후 신규 계약의 컬럼 기본값도 true로 변경
ALTER TABLE public.lease_contracts
  ALTER COLUMN vat_included SET DEFAULT true;
