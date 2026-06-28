-- ============================================================
-- 신용카드 2단계 분개 지원
--   1) 미지급금(322) 계정 신설 — 카드대금 전용 부채
--   2) entry_type CHECK 제약에 '카드지출','카드결제' 추가
-- ============================================================

-- 1. 기존 조직에 미지급금 계정 삽입 (이미 있으면 무시)
INSERT INTO public.chart_of_accounts
  (organization_id, code, name, account_type, account_subtype, normal_balance, is_system)
SELECT o.id, v.code, v.name, v.account_type, v.account_subtype, v.normal_balance::text, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('322', '미지급금', '부채', '유동부채', '대변')
) AS v(code, name, account_type, account_subtype, normal_balance)
ON CONFLICT (organization_id, code) DO NOTHING;

-- 2. 신규 조직 seed 함수에 미지급금 반영 (CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(p_org_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.chart_of_accounts
    (organization_id, code, name, account_type, account_subtype, normal_balance, is_system)
  VALUES
    -- 자산
    (p_org_id, '101', '현금',                 '자산', '유동자산',   '차변', true),
    (p_org_id, '102', '보통예금',              '자산', '유동자산',   '차변', true),
    (p_org_id, '103', '당좌예금',              '자산', '유동자산',   '차변', true),
    (p_org_id, '110', '미수임대료',            '자산', '유동자산',   '차변', true),
    (p_org_id, '111', '미수간주임대료',         '자산', '유동자산',   '차변', true),
    (p_org_id, '115', '선급비용',              '자산', '유동자산',   '차변', true),
    (p_org_id, '120', '단기대여금',            '자산', '유동자산',   '차변', true),
    (p_org_id, '200', '건물',                 '자산', '비유동자산',  '차변', true),
    (p_org_id, '201', '건물감가상각누계액',     '자산', '비유동자산',  '대변', true),
    (p_org_id, '210', '토지',                 '자산', '비유동자산',  '차변', true),
    (p_org_id, '220', '시설장치',             '자산', '비유동자산',  '차변', true),
    (p_org_id, '221', '시설장치감가상각누계액', '자산', '비유동자산',  '대변', true),
    (p_org_id, '230', '임차보증금자산',        '자산', '비유동자산',  '차변', true),
    -- 부채
    (p_org_id, '310', '임대보증금',            '부채', '비유동부채',  '대변', true),
    (p_org_id, '311', '단기임대보증금',         '부채', '유동부채',   '대변', true),
    (p_org_id, '320', '미지급비용',            '부채', '유동부채',   '대변', true),
    (p_org_id, '321', '미지급세금',            '부채', '유동부채',   '대변', true),
    (p_org_id, '322', '미지급금',              '부채', '유동부채',   '대변', true),
    (p_org_id, '330', '선수임대료',            '부채', '유동부채',   '대변', true),
    (p_org_id, '340', '예수부가가치세',         '부채', '유동부채',   '대변', true),
    (p_org_id, '350', '차입금',               '부채', '비유동부채',  '대변', true),
    -- 자본
    (p_org_id, '410', '자본금',               '자본', '자본금',     '대변', true),
    (p_org_id, '420', '이익잉여금',            '자본', '이익잉여금',  '대변', true),
    (p_org_id, '430', '당기순이익',            '자본', '이익잉여금',  '대변', true),
    -- 수익
    (p_org_id, '510', '임대수익',             '수익', '영업수익',   '대변', true),
    (p_org_id, '511', '간주임대료수익',         '수익', '영업수익',   '대변', true),
    (p_org_id, '520', '관리비수익',            '수익', '영업수익',   '대변', true),
    (p_org_id, '530', '이자수익',             '수익', '영업외수익',  '대변', true),
    (p_org_id, '540', '임대보증금이자',         '수익', '영업외수익',  '대변', true),
    (p_org_id, '590', '기타수익',             '수익', '영업외수익',  '대변', true),
    -- 비용
    (p_org_id, '610', '감가상각비',            '비용', '영업비용',   '차변', true),
    (p_org_id, '620', '수선유지비',            '비용', '영업비용',   '차변', true),
    (p_org_id, '630', '보험료',               '비용', '영업비용',   '차변', true),
    (p_org_id, '640', '재산세',               '비용', '영업비용',   '차변', true),
    (p_org_id, '641', '종합부동산세',          '비용', '영업비용',   '차변', true),
    (p_org_id, '642', '부가가치세',            '비용', '세금과공과',  '차변', true),
    (p_org_id, '643', '제세공과금',            '비용', '영업비용',   '차변', true),
    (p_org_id, '650', '이자비용',             '비용', '영업외비용',  '차변', true),
    (p_org_id, '660', '세무사수수료',          '비용', '일반관리비',  '차변', true),
    (p_org_id, '661', '법무사수수료',          '비용', '일반관리비',  '차변', true),
    (p_org_id, '662', '지급수수료',            '비용', '일반관리비',  '차변', true),
    (p_org_id, '670', '광고선전비',            '비용', '일반관리비',  '차변', true),
    (p_org_id, '671', '소모품비',              '비용', '일반관리비',  '차변', true),
    (p_org_id, '680', '통신비',               '비용', '일반관리비',  '차변', true),
    (p_org_id, '690', '기타비용',             '비용', '영업외비용',  '차변', true)
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$;

-- 3. entry_type CHECK 제약 갱신: '카드지출','카드결제' 추가
ALTER TABLE journal_entries
  DROP CONSTRAINT journal_entries_entry_type_check;

ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_entry_type_check
  CHECK (entry_type IN (
    '일반','임대수익','보증금수령','보증금반환',
    '감가상각','간주임대료','세금','관리비','비용지출',
    '카드지출','카드결제'
  ));
