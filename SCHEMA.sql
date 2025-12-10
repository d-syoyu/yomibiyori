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
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- スポンサーお題ステータス変更通知トリガ
create or replace function app_public.notify_sponsor_theme_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sponsor_id uuid;
  v_title text;
  v_message text;
begin
  -- ステータスが変更された場合のみ処理
  if (TG_OP = 'UPDATE' and old.status = new.status) then
    return new;
  end if;

  -- approved, rejected, published の場合のみ通知
  if new.status not in ('approved', 'rejected', 'published') then
    return new;
  end if;

  -- スポンサーIDを取得（campaign経由）
  select sc.sponsor_id into v_sponsor_id
  from app_public.sponsor_campaigns sc
  where sc.id = new.campaign_id;

  if v_sponsor_id is null then
    return new;
  end if;

  -- 通知メッセージを生成
  case new.status
    when 'approved' then
      v_title := 'お題が承認されました';
      v_message := 'お題「' || new.text_575 || '」が審査を通過し、承認されました。配信日: ' || to_char(new.date, 'YYYY年MM月DD日');
    when 'rejected' then
      v_title := 'お題が却下されました';
      if new.rejection_reason is not null and new.rejection_reason != '' then
        v_message := 'お題「' || new.text_575 || '」は審査の結果、却下されました。理由: ' || new.rejection_reason;
      else
        v_message := 'お題「' || new.text_575 || '」は審査の結果、却下されました。';
      end if;
    when 'published' then
      v_title := 'お題が配信されました';
      v_message := 'お題「' || new.text_575 || '」が配信されました。ユーザーの反応をインサイトページでご確認いただけます。';
  end case;

  -- 通知を作成
  insert into app_public.sponsor_theme_notifications (
    sponsor_theme_id,
    sponsor_id,
    status,
    title,
    message
  ) values (
    new.id,
    v_sponsor_id,
    new.status,
    v_title,
    v_message
  );

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
  role text not null default 'user' check (role in ('user', 'sponsor', 'admin')),
  birth_year integer check (birth_year is null or (birth_year between 1900 and 2025)),
  gender text check (gender is null or gender in ('male', 'female', 'other')),
  prefecture text check (prefecture is null or length(prefecture) between 1 and 50),
  device_info jsonb,
  analytics_opt_out boolean not null default false,
  notify_theme_release boolean not null default true,
  notify_ranking_result boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_users_updated_at
before update on users
for each row execute function app_public.set_updated_at();
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_birth_year on users(birth_year) where birth_year is not null;
create index if not exists idx_users_gender on users(gender) where gender is not null;
create index if not exists idx_users_prefecture on users(prefecture) where prefecture is not null;

comment on table users is '�A�v�����v���t�B�[���iSupabase��auth.users�Ƃ͓Ɨ��^�p�\�j';
comment on column users.role is '���[�U�[���[��: user�i��ʁj / sponsor�i�X�|���T�[�j / admin�i�Ǘ��ҁj';
comment on column users.birth_year is '生年（例: 1990）';
comment on column users.gender is '性別: male（男性）/ female（女性）/ other（その他）';
comment on column users.prefecture is '都道府県';
comment on column users.device_info is ' {platform, os_version, timezone, locale} �Ȃǂ̃f�o�C�X����';
comment on column users.analytics_opt_out is '���̓g���b�N�̎��ΐ��';
comment on column users.notify_theme_release is '06:00 �V���_�ӂ̃��[�U�[�ʒm';
comment on column users.notify_ranking_result is '22:00 �����L���O���m�̕ʒm';

-- ========= 通知トークン =========
create table if not exists notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  expo_push_token text not null,
  device_id text,
  platform text,
  app_version text,
  is_active boolean not null default true,
  last_registered_at timestamptz not null default now(),
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_notification_tokens_push_token unique (expo_push_token)
);
create trigger trg_notification_tokens_updated_at
before update on notification_tokens
for each row execute function app_public.set_updated_at();
create index if not exists idx_notification_tokens_user_active on notification_tokens(user_id) where is_active = true;
create index if not exists idx_notification_tokens_active on notification_tokens(is_active);

comment on table notification_tokens is 'Expo Push トークン登録テーブル';
comment on column notification_tokens.expo_push_token is 'ExponentPushToken[...] 形式のトークン';
comment on column notification_tokens.is_active is 'Expo エラー発生時に無効化するフラグ';


-- ========= お題（上の句） =========
create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (length(text) between 3 and 140),
  category text not null default 'general',
  -- 「日」を一意に識別（JST 06:00 解禁の当日を date として扱う）
  date date not null,
  sponsored boolean not null default false,
  sponsor_theme_id uuid references sponsor_themes(id) on delete set null,
  sponsor_company_name text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_themes_category_date on themes(category, date);
create index if not exists idx_themes_sponsor_theme_id on themes(sponsor_theme_id);

comment on table themes is '日替わりお題（上の句 5-7-5）';
comment on column themes.sponsor_theme_id is '承認されたスポンサーお題へのリンク';
comment on column themes.sponsor_company_name is 'スポンサー企業名（表示用：「提供：企業名」）';

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

-- ========= スポンサー =========
create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(company_name) between 1 and 200),
  contact_email text,
  official_url text,
  logo_url text,
  plan_tier text not null default 'basic' check (plan_tier in ('basic', 'standard', 'premium')),
  verified boolean not null default false,
  -- 以下は旧フィールド（後方互換性のため残す）
  text text check (length(text) between 3 and 140),
  category text,
  target_regions text[] not null default '{}'::text[],
  target_age_min smallint check (target_age_min between 0 and 120),
  target_age_max smallint check (
    target_age_max between 0 and 120
    and (target_age_min is null or target_age_max >= target_age_min)
  ),
  budget numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_sponsors_updated_at
before update on sponsors
for each row execute function app_public.set_updated_at();

comment on table sponsors is 'スポンサー企業情報';
comment on column sponsors.plan_tier is '料金プラン: basic / standard / premium';
comment on column sponsors.verified is 'KYC承認済みフラグ';

-- ========= スポンサーキャンペーン =========
create table if not exists sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  budget numeric(12,2),
  start_date date,
  end_date date check (end_date is null or start_date is null or end_date >= start_date),
  targeting jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_sponsor_campaigns_updated_at
before update on sponsor_campaigns
for each row execute function app_public.set_updated_at();
create index if not exists idx_sponsor_campaigns_sponsor_id on sponsor_campaigns(sponsor_id);
create index if not exists idx_sponsor_campaigns_status on sponsor_campaigns(status);

comment on table sponsor_campaigns is 'スポンサー広告キャンペーン';
comment on column sponsor_campaigns.targeting is 'ターゲティング条件（region/age_band/os）';

-- ========= スポンサーお題 =========
create table if not exists sponsor_themes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references sponsor_campaigns(id) on delete cascade,
  date date not null,
  category text not null check (length(category) between 1 and 50),
  text_575 text not null check (length(text_575) between 3 and 140),
  sponsor_official_url text,
  priority integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'published')),
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_sponsor_themes_updated_at
before update on sponsor_themes
for each row execute function app_public.set_updated_at();
create trigger trg_sponsor_themes_status_notify
after insert or update on sponsor_themes
for each row execute function app_public.notify_sponsor_theme_status_change();
create index if not exists idx_sponsor_themes_campaign_id on sponsor_themes(campaign_id);
create index if not exists idx_sponsor_themes_date_category on sponsor_themes(date, category);
create index if not exists idx_sponsor_themes_status on sponsor_themes(status);
create unique index if not exists uq_sponsor_themes_date_category_campaign on sponsor_themes(campaign_id, date, category);

comment on table sponsor_themes is 'スポンサー入稿お題（審査待ち）';
comment on column sponsor_themes.text_575 is '上の句（5-7-5）';
comment on column sponsor_themes.sponsor_official_url is 'お題ごとのスポンサーリンクURL（キャンペーンやイベント固有のURL）';
comment on column sponsor_themes.priority is 'スロット優先度（高いほど優先）';
comment on column sponsor_themes.status is 'ステータス: pending（審査待ち） / approved（承認済み） / rejected（却下） / published（配信済み）';

-- ========= スポンサーお知らせ =========
create table if not exists sponsor_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  content text not null check (length(content) between 1 and 2000),
  type text not null default 'info' check (type in ('info', 'warning', 'success', 'update')),
  priority integer not null default 0,
  is_pinned boolean not null default false,
  is_published boolean not null default true,
  expires_at timestamptz default null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_sponsor_announcements_updated_at
before update on sponsor_announcements
for each row execute function app_public.set_updated_at();
create index if not exists idx_sponsor_announcements_published on sponsor_announcements(is_published, created_at desc);
create index if not exists idx_sponsor_announcements_pinned on sponsor_announcements(is_pinned) where is_pinned = true;

comment on table sponsor_announcements is 'スポンサー向けお知らせ（管理者が作成）';
comment on column sponsor_announcements.type is 'お知らせタイプ: info / warning / success / update';
comment on column sponsor_announcements.priority is '表示優先度（高いほど上位表示）';
comment on column sponsor_announcements.is_pinned is 'ピン留めフラグ（常に上部に表示）';
comment on column sponsor_announcements.expires_at is '有効期限（nullの場合は無期限）';

-- ========= スポンサーお題ステータス通知 =========
create table if not exists sponsor_theme_notifications (
  id uuid primary key default gen_random_uuid(),
  sponsor_theme_id uuid not null references sponsor_themes(id) on delete cascade,
  sponsor_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('approved', 'rejected', 'published')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_sponsor_theme_notifications_sponsor on sponsor_theme_notifications(sponsor_id, is_read, created_at desc);
create index if not exists idx_sponsor_theme_notifications_theme on sponsor_theme_notifications(sponsor_theme_id);

comment on table sponsor_theme_notifications is 'スポンサーお題のステータス変更通知';
comment on column sponsor_theme_notifications.status is '変更後のステータス: approved / rejected / published';
comment on column sponsor_theme_notifications.is_read is '既読フラグ';

-- ========= ビュー：作品のメタ（いいね数を集約） =========
-- SECURITY INVOKER を明示してRLSポリシーを適用
create or replace view works_with_metrics
with (security_invoker = true) as
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
alter table sponsor_campaigns enable row level security;
alter table sponsor_themes enable row level security;
alter table sponsor_announcements enable row level security;
alter table sponsor_theme_notifications enable row level security;

-- 役割補助（Supabase互換）。Supabaseで動作する場合は auth.uid(), auth.role() を利用可能。
-- ここでは存在しない環境でも動くようフォールバック関数を用意（no-op的）。
-- ロール: authenticated（一般ユーザー）と service_role（管理ジョブ）を想定し、ポリシーで判定する。
create or replace function app_public.current_uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_uid', true), '')::uuid;
$$;

create or replace function app_public.is_service_role()
returns boolean
language sql
stable
set search_path = ''
as $$
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
create policy if not exists read_sponsor_campaigns on sponsor_campaigns
  for select using (true);
create policy if not exists read_sponsor_themes on sponsor_themes
  for select using (true);
create policy if not exists read_sponsor_announcements on sponsor_announcements
  for select using (
    is_published = true
    and (expires_at is null or expires_at > now())
  );

-- sponsor_announcements: 管理者のみ作成・更新・削除可能
create policy if not exists write_admin_announcements on sponsor_announcements
  for all
  using (
    exists (
      select 1
      from users
      where id = coalesce(app_public.current_uid(), auth.uid())
      and role = 'admin'
    )
    or app_public.is_service_role()
  )
  with check (
    exists (
      select 1
      from users
      where id = coalesce(app_public.current_uid(), auth.uid())
      and role = 'admin'
    )
    or app_public.is_service_role()
  );

-- sponsor_theme_notifications: 自分宛の通知のみ閲覧可能
create policy if not exists read_own_theme_notifications on sponsor_theme_notifications
  for select
  using (sponsor_id = app_public.current_uid());

-- sponsor_theme_notifications: 自分の通知のみ更新可能（既読状態など）
create policy if not exists update_own_theme_notifications on sponsor_theme_notifications
  for update
  using (sponsor_id = app_public.current_uid())
  with check (sponsor_id = app_public.current_uid());

-- sponsor_theme_notifications: システムと管理者のみ作成可能
create policy if not exists insert_theme_notifications on sponsor_theme_notifications
  for insert
  with check (
    exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  );

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

-- sponsor_campaigns: sponsorロールは自分のキャンペーンのみCRUD可能、adminは全て
create policy if not exists insert_own_campaign on sponsor_campaigns
  for insert
  with check (
    exists (select 1 from users where id = app_public.current_uid() and role in ('sponsor', 'admin'))
    or app_public.is_service_role()
  );

create policy if not exists update_own_campaign on sponsor_campaigns
  for update
  using (
    sponsor_id = app_public.current_uid()
    or exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  )
  with check (
    sponsor_id = app_public.current_uid()
    or exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  );

create policy if not exists delete_own_campaign on sponsor_campaigns
  for delete
  using (
    sponsor_id = app_public.current_uid()
    or exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  );

-- sponsor_themes: sponsorは自分のキャンペーンのお題のみCRUD、adminは全て
create policy if not exists insert_own_sponsor_theme on sponsor_themes
  for insert
  with check (
    campaign_id in (
      select id from sponsor_campaigns where sponsor_id = app_public.current_uid()
    )
    or exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  );

create policy if not exists update_own_sponsor_theme on sponsor_themes
  for update
  using (
    campaign_id in (
      select id from sponsor_campaigns where sponsor_id = app_public.current_uid()
    )
    or exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  )
  with check (
    campaign_id in (
      select id from sponsor_campaigns where sponsor_id = app_public.current_uid()
    )
    or exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  );

create policy if not exists delete_own_sponsor_theme on sponsor_themes
  for delete
  using (
    campaign_id in (
      select id from sponsor_campaigns where sponsor_id = app_public.current_uid()
    )
    or exists (select 1 from users where id = app_public.current_uid() and role = 'admin')
    or app_public.is_service_role()
  );

-- ========= 便利関数：Wilson下限スコア（参考実装、アプリ側で算出推奨） =========
-- likes_count と 表示回数等からの算出を想定。ここでは p=likes/n のWilson下限を返す。
create or replace function app_public.wilson_lower_bound(likes int, n int, z numeric default 1.96)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
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
