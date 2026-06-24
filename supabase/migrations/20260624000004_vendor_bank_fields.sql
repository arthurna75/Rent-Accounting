-- vendors 테이블에 계좌정보 필드 추가
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS bank_name       TEXT,
  ADD COLUMN IF NOT EXISTS account_number  TEXT,
  ADD COLUMN IF NOT EXISTS account_holder  TEXT;

COMMENT ON COLUMN public.vendors.bank_name      IS '은행명';
COMMENT ON COLUMN public.vendors.account_number IS '계좌번호';
COMMENT ON COLUMN public.vendors.account_holder IS '예금주';
