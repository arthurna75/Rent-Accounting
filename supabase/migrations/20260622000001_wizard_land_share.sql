-- 복식부기 전환 마법사: 토지 지분율 컬럼 추가
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS land_share_ratio NUMERIC(10, 6);  -- 예: 0.041667 (1/24)
