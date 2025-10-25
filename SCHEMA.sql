-- SCHEMA.sql — 詠日和（よみびより） PostgreSQL DDL
-- 依存: PostgreSQL 14+, pgcrypto/pgjwt（Supabase利用時）, 時刻はすべてUTC基準で保存
-- 方針: 読み取りは基本公開（詠の鑑賞性を重視）、書き込みは厳格にRLSで制御

-- 拡張
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists "uuid-ossp";

-- スキーマ
create schema if not exists app_public;
set search_path = app_public, public;

-- タイムスタンプ自動更新トリガ
create or replace function app_public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========= ユーザー =========
-- Supabase利用時: auth.users(id) が存在する想定。
-- 直接参照しない場合に備え、ローカル独立運用も可能とする。
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  email text unique not null check (position('@' in email) > 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_users_updated_at
before update on users
for each row execute function app_public.set_updated_at();

comment on table users is 'アプリ内プロフィール（Supabaseのauth.usersとは独立運用可能）';

-- ========= お題（上の句） =========
create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (length(text) between 3 and 140),
  category text not null default 'general',
  -- 「日」を一意に識別（JST 06:00 解禁の当日を date として扱う）
  date date not null,
  sponsored boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_themes_category_date on themes(category, date);

-- ========= 作品（下の句） =========
create table if not exists works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  text varchar(40) not null check (length(text) >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_works_updated_at
before update on works
for each row execute function app_public.set_updated_at();

-- 1ユーザー1作品/お題 を保証
create unique index if not exists uq_works_user_theme on works(user_id, theme_id);
create index if not exists idx_works_theme_created on works(theme_id, created_at desc);

-- ========= いいね（共鳴） =========
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  work_id uuid not null references works(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- 同一ユーザーの重複いいね禁止
create unique index if not exists uq_likes_user_work on likes(user_id, work_id);
create index if not exists idx_likes_work on likes(work_id);

-- ========= ランキング・スナップショット =========
create table if not exists rankings (
  id bigserial primary key,
  theme_id uuid not null references themes(id) on delete cascade,
  work_id uuid not null references works(id) on delete cascade,
  score numeric(8,5) not null,        -- Wilson信頼区間等の最終スコア
  rank integer not null,
  snapshot_time timestamptz not null default now()
);
create index if not exists idx_rankings_theme_score on rankings(theme_id, score desc);
create index if not exists idx_rankings_theme_rank on rankings(theme_id, rank);

-- ========= スポンサーお題 =========
create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  text text not null check (length(text) between 3 and 140),
  category text not null default 'general',
  target_regions text[] not null default '{}'::text[],
  target_age_min smallint check (target_age_min between 0 and 120),
  target_age_max smallint check (
    target_age_max between 0 and 120
    and (target_age_min is null or target_age_max >= target_age_min)
  ),
  budget numeric(12,2),
  created_at timestamptz not null default now()
);

-- ========= ビュー：作品のメタ（いいね数を集約） =========
create or replace view works_with_metrics as
select
  w.*,
  coalesce(lc.likes_count, 0) as likes_count
from works w
left join (
  select work_id, count(*)::int as likes_count
  from likes
  group by work_id
) lc on lc.work_id = w.id;

-- ========= RLS（Row Level Security） =========
alter table users enable row level security;
alter table works enable row level security;
alter table likes enable row level security;
alter table rankings enable row level security;
alter table themes enable row level security;
alter table sponsors enable row level security;

-- 役割補助（Supabase互換）。Supabaseで動作する場合は auth.uid(), auth.role() を利用可能。
-- ここでは存在しない環境でも動くようフォールバック関数を用意（no-op的）。
-- ロール: authenticated（一般ユーザー）と service_role（管理ジョブ）を想定し、ポリシーで判定する。
create or replace function app_public.current_uid()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_uid', true), '')::uuid;
$$;

create or replace function app_public.is_service_role()
returns boolean language sql stable as $$
  select current_setting('app.current_role', true) = 'service_role';
$$;

-- 読み取りは全員許可（公開SNSの鑑賞性を担保）
create policy if not exists read_users on users
  for select using (true);
create policy if not exists read_themes on themes
  for select using (true);
create policy if not exists read_works on works
  for select using (true);
create policy if not exists read_likes on likes
  for select using (true);
create policy if not exists read_rankings on rankings
  for select using (true);
create policy if not exists read_sponsors on sponsors
  for select using (true);

-- users: 自分のプロフィールのみ書き込みを許可
create policy if not exists write_own_user on users
  for all
  using (id = coalesce(app_public.current_uid(), id))
  with check (id = coalesce(app_public.current_uid(), id));

-- works: 自分の作品のみ作成・更新・削除可能（1日1首はユニーク制約で担保）
create policy if not exists insert_own_work on works
  for insert
  with check (user_id = app_public.current_uid() or app_public.is_service_role());

create policy if not exists update_own_work on works
  for update
  using (user_id = app_public.current_uid() or app_public.is_service_role())
  with check (user_id = app_public.current_uid() or app_public.is_service_role());

create policy if not exists delete_own_work on works
  for delete
  using (user_id = app_public.current_uid() or app_public.is_service_role());

-- likes: 自分のいいねのみ作成・削除可能
create policy if not exists insert_own_like on likes
  for insert
  with check (user_id = app_public.current_uid() or app_public.is_service_role());

create policy if not exists delete_own_like on likes
  for delete
  using (user_id = app_public.current_uid() or app_public.is_service_role());

-- themes/sponsors/rankings: サービスロールのみ書き込み可能（ジョブ・管理画面）
create policy if not exists write_service_themes on themes
  for all
  using (app_public.is_service_role())
  with check (app_public.is_service_role());

create policy if not exists write_service_sponsors on sponsors
  for all
  using (app_public.is_service_role())
  with check (app_public.is_service_role());

create policy if not exists write_service_rankings on rankings
  for all
  using (app_public.is_service_role())
  with check (app_public.is_service_role());

-- ========= 便利関数：Wilson下限スコア（参考実装、アプリ側で算出推奨） =========
-- likes_count と 表示回数等からの算出を想定。ここでは p=likes/n のWilson下限を返す。
create or replace function app_public.wilson_lower_bound(likes int, n int, z numeric default 1.96)
returns numeric language plpgsql immutable as $$
declare
  phat numeric;
  denom numeric;
begin
  if n <= 0 then
    return 0;
  end if;
  phat := likes::numeric / n;
  denom := 1 + (z*z)/n;
  return ((phat + (z*z)/(2*n) - z * sqrt((phat*(1-phat) + (z*z)/(4*n))/n)) / denom);
end;
$$;

-- ========= 権限メモ（運用で設定） =========
-- アプリ実行時に、接続ロールごとに下記のような GUC を設定する想定:
--   set app.current_uid = '<user-uuid>';
--   set app.current_role = 'service_role' | 'anonymous' | 'user';
-- Supabase環境では自動的に auth.uid(), auth.role() が利用できるため上記は不要。

-- ========= 完了 =========

