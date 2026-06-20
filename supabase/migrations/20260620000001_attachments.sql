-- ============================================================
-- 첨부파일 URL 컬럼 추가 (journal_entries, lease_contracts)
-- ============================================================

-- 1. 전표 첨부파일
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.journal_entries.attachment_urls IS '첨부 이미지/파일 URL 목록 (Supabase Storage)';

-- 2. 계약서 첨부파일
ALTER TABLE public.lease_contracts
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.lease_contracts.attachment_urls IS '계약서 이미지/문서 URL 목록 (Supabase Storage)';

-- ============================================================
-- Supabase Storage: attachments 버킷 정책 (버킷은 대시보드에서 생성)
-- 버킷 이름: attachments (public)
-- ============================================================

-- 스토리지 정책: 조직 구성원만 업로드/조회/삭제 가능
-- (Supabase 대시보드 Storage > attachments 버킷 생성 후 아래 정책 활성화)

-- INSERT (업로드): 인증된 사용자
-- SELECT (조회): public (공개 버킷이면 불필요)
-- DELETE (삭제): 인증된 사용자
