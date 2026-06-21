-- ============================================================
-- 부동산명을 건물명(building_name) + 호실(unit_number)로 분리
-- ============================================================

-- 1. 신규 컬럼 추가
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS building_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit_number   TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.properties.building_name IS '건물명 (예: 강남 오피스텔)';
COMMENT ON COLUMN public.properties.unit_number   IS '호실 (예: 101호) — 선택';

-- 2. 기존 name 값을 building_name으로 마이그레이션
UPDATE public.properties
  SET building_name = name
  WHERE building_name = '';

-- 3. name 자동동기화 트리거 함수
--    INSERT / UPDATE 시 name = building_name [ + ' ' + unit_number ] 로 유지
CREATE OR REPLACE FUNCTION public.fn_sync_property_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.name := CASE
    WHEN NEW.unit_number IS NULL OR TRIM(NEW.unit_number) = ''
    THEN NEW.building_name
    ELSE NEW.building_name || ' ' || NEW.unit_number
  END;
  RETURN NEW;
END;
$$;

-- 4. 트리거 등록
DROP TRIGGER IF EXISTS trg_sync_property_name ON public.properties;
CREATE TRIGGER trg_sync_property_name
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_property_name();

-- 5. 기존 rows name 재동기화 (트리거 발동하여 name 갱신)
UPDATE public.properties SET building_name = building_name;

-- ============================================================
-- 완료 후 확인 쿼리 (주석 참고용)
-- SELECT id, building_name, unit_number, name FROM public.properties LIMIT 10;
-- ============================================================
