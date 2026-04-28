-- Настройка хранения согласий и версий политики конфиденциальности
-- Выполните в Supabase SQL Editor.

begin;

-- 1) Поля согласия в заявках
alter table if exists public.orders
  add column if not exists privacy_consent boolean not null default false,
  add column if not exists consent_at timestamptz,
  add column if not exists policy_version text,
  add column if not exists policy_url text;

-- 2) Версионирование публичной политики (опционально, но полезно для аудита)
create table if not exists public.policy_versions (
  id bigserial primary key,
  version text not null unique,
  published_at timestamptz not null default now(),
  url text not null default '/privacy.html',
  summary text,
  full_text text
);

-- Текущая стартовая версия
insert into public.policy_versions (version, url, summary)
values ('2026-04-28', '/privacy.html', 'Первая опубликованная редакция политики на сайте.')
on conflict (version) do nothing;

-- 3) Таблица внутренних заметок админки (используется блоком "Внутренние изменения политики")
create table if not exists public.admin_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Подготовим запись-ключ по умолчанию
insert into public.admin_settings (key, value)
values ('privacy_policy_changes', '')
on conflict (key) do nothing;

-- 4) RLS для admin_settings: только авторизованные пользователи
alter table public.admin_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_settings'
      and policyname = 'admin_settings_select_auth'
  ) then
    create policy admin_settings_select_auth
      on public.admin_settings
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_settings'
      and policyname = 'admin_settings_upsert_auth'
  ) then
    create policy admin_settings_upsert_auth
      on public.admin_settings
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

commit;
