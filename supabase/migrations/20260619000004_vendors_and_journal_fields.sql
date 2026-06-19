-- ============================================================
-- 거래처(vendors) 테이블 + 분개장 신규 컬럼
-- ============================================================

-- 1. 거래처 테이블
CREATE TABLE IF NOT EXISTS public.vendors (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  business_number TEXT,
  memo            TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select" ON public.vendors FOR SELECT TO authenticated
  USING (organization_id = public.my_organization_id());

CREATE POLICY "vendors_insert" ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.my_organization_id()
              AND public.my_role() IN ('owner', 'accountant'));

CREATE POLICY "vendors_update" ON public.vendors FOR UPDATE TO authenticated
  USING (organization_id = public.my_organization_id()
         AND public.my_role() IN ('owner', 'accountant'));

CREATE POLICY "vendors_delete" ON public.vendors FOR DELETE TO authenticated
  USING (organization_id = public.my_organization_id()
         AND public.my_role() IN ('owner', 'accountant'));

-- 2. 분개장 신규 컬럼
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS vendor_id     UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_type TEXT;

COMMENT ON COLUMN public.journal_entries.vendor_id     IS '지급처 (거래처 마스터 FK)';
COMMENT ON COLUMN public.journal_entries.evidence_type IS '증빙 종류: 현금영수증|세금계산서|영수증|기타';
