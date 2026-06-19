-- ============================================================
-- Seed: Standard Interest Rates (국세청 기준이율)
-- Migration: 20260618000003
-- ============================================================
insert into public.standard_interest_rates (effective_year, rate, source_reference) values
  (2019, 0.0213, '기획재정부령'),
  (2020, 0.0180, '기획재정부령'),
  (2021, 0.0120, '기획재정부령'),
  (2022, 0.0120, '기획재정부령'),
  (2023, 0.0260, '기획재정부령'),
  (2024, 0.0290, '기획재정부령'),
  (2025, 0.0290, '기획재정부령'),
  (2026, 0.0290, '기획재정부령 (예정)');

-- ============================================================
-- Function: 신규 조직 가입 시 기본 계정과목 자동 생성
-- ============================================================
create or replace function public.seed_chart_of_accounts(p_org_id uuid)
returns void language plpgsql as $$
begin
  insert into public.chart_of_accounts
    (organization_id, code, name, account_type, account_subtype, normal_balance, is_system)
  values
    -- 자산
    (p_org_id, '101', '현금',                  '자산', '유동자산',   '차변', true),
    (p_org_id, '102', '보통예금',               '자산', '유동자산',   '차변', true),
    (p_org_id, '103', '당좌예금',               '자산', '유동자산',   '차변', true),
    (p_org_id, '110', '미수임대료',             '자산', '유동자산',   '차변', true),
    (p_org_id, '111', '미수간주임대료',          '자산', '유동자산',   '차변', true),
    (p_org_id, '115', '선급비용',               '자산', '유동자산',   '차변', true),
    (p_org_id, '120', '단기대여금',             '자산', '유동자산',   '차변', true),
    (p_org_id, '200', '건물',                  '자산', '비유동자산',  '차변', true),
    (p_org_id, '201', '건물감가상각누계액',      '자산', '비유동자산',  '대변', true),
    (p_org_id, '210', '토지',                  '자산', '비유동자산',  '차변', true),
    (p_org_id, '220', '시설장치',              '자산', '비유동자산',  '차변', true),
    (p_org_id, '221', '시설장치감가상각누계액',  '자산', '비유동자산',  '대변', true),
    (p_org_id, '230', '임차보증금자산',         '자산', '비유동자산',  '차변', true),
    -- 부채
    (p_org_id, '310', '임대보증금',             '부채', '비유동부채',  '대변', true),
    (p_org_id, '311', '단기임대보증금',          '부채', '유동부채',   '대변', true),
    (p_org_id, '320', '미지급비용',             '부채', '유동부채',   '대변', true),
    (p_org_id, '321', '미지급세금',             '부채', '유동부채',   '대변', true),
    (p_org_id, '330', '선수임대료',             '부채', '유동부채',   '대변', true),
    (p_org_id, '340', '예수부가가치세',          '부채', '유동부채',   '대변', true),
    (p_org_id, '350', '차입금',                 '부채', '비유동부채',  '대변', true),
    -- 자본
    (p_org_id, '410', '자본금',                '자본', '자본금',     '대변', true),
    (p_org_id, '420', '이익잉여금',             '자본', '이익잉여금',  '대변', true),
    (p_org_id, '430', '당기순이익',             '자본', '이익잉여금',  '대변', true),
    -- 수익
    (p_org_id, '510', '임대수익',              '수익', '영업수익',   '대변', true),
    (p_org_id, '511', '간주임대료수익',          '수익', '영업수익',   '대변', true),
    (p_org_id, '520', '관리비수익',             '수익', '영업수익',   '대변', true),
    (p_org_id, '530', '이자수익',              '수익', '영업외수익',  '대변', true),
    (p_org_id, '540', '임대보증금이자',          '수익', '영업외수익',  '대변', true),
    (p_org_id, '590', '기타수익',              '수익', '영업외수익',  '대변', true),
    -- 비용
    (p_org_id, '610', '감가상각비',             '비용', '영업비용',   '차변', true),
    (p_org_id, '620', '수선유지비',             '비용', '영업비용',   '차변', true),
    (p_org_id, '630', '보험료',                '비용', '영업비용',   '차변', true),
    (p_org_id, '640', '재산세',                '비용', '영업비용',   '차변', true),
    (p_org_id, '641', '종합부동산세',           '비용', '영업비용',   '차변', true),
    (p_org_id, '642', '부가가치세',             '비용', '세금과공과',  '차변', true),
    (p_org_id, '650', '이자비용',              '비용', '영업외비용',  '차변', true),
    (p_org_id, '660', '세무사수수료',           '비용', '일반관리비',  '차변', true),
    (p_org_id, '661', '법무사수수료',           '비용', '일반관리비',  '차변', true),
    (p_org_id, '670', '광고선전비',             '비용', '일반관리비',  '차변', true),
    (p_org_id, '680', '통신비',                '비용', '일반관리비',  '차변', true),
    (p_org_id, '690', '기타비용',              '비용', '영업외비용',  '차변', true);
end;
$$;

-- ============================================================
-- Trigger: 신규 organization 생성 시 계정과목 자동 생성
-- ============================================================
create or replace function public.on_organization_created()
returns trigger language plpgsql security definer as $$
begin
  perform public.seed_chart_of_accounts(new.id);

  -- 현재 연도 회계연도 자동 생성
  insert into public.fiscal_years(organization_id, year, start_date, end_date)
  values (
    new.id,
    extract(year from now())::int,
    date_trunc('year', now())::date,
    (date_trunc('year', now()) + interval '1 year' - interval '1 day')::date
  );

  return new;
end;
$$;

create trigger trg_on_org_created
  after insert on public.organizations
  for each row execute function public.on_organization_created();

-- ============================================================
-- Trigger: auth.users 가입 시 user_profiles 생성 (서비스 역할)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- 메타데이터에서 조직 정보 추출 (회원가입 시 전달)
  if new.raw_user_meta_data->>'organization_id' is not null then
    insert into public.user_profiles(id, organization_id, full_name, role)
    values (
      new.id,
      (new.raw_user_meta_data->>'organization_id')::uuid,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      coalesce(new.raw_user_meta_data->>'role', 'viewer')
    );
  end if;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
