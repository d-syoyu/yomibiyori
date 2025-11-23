create or replace function app_public.is_service_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_setting('app.current_role', true) = 'service_role';
$$;

-- Allow admin announcement writes from both backend (GUC) and Supabase auth uid
drop policy if exists write_admin_announcements on sponsor_announcements;

create policy write_admin_announcements on sponsor_announcements
  for all
  using (
    exists (
      select 1
      from users
      where id = coalesce(current_setting('app.current_uid', true)::uuid, auth.uid())
      and role = 'admin'
    )
    or app_public.is_service_role()
  )
  with check (
    exists (
      select 1
      from users
      where id = coalesce(current_setting('app.current_uid', true)::uuid, auth.uid())
      and role = 'admin'
    )
    or app_public.is_service_role()
  );
