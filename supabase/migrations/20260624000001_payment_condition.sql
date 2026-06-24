-- 임대계약 지급조건 컬럼 추가 (선불/후불)
ALTER TABLE lease_contracts
ADD COLUMN IF NOT EXISTS payment_condition VARCHAR(10) NOT NULL DEFAULT '선불';

COMMENT ON COLUMN lease_contracts.payment_condition IS '지급조건: 선불(당월 납부) 또는 후불(익월 납부)';
