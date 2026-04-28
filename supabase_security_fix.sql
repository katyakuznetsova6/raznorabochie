-- =====================================================================
-- ИСПРАВЛЕНИЕ БЕЗОПАСНОСТИ RLS
-- Выполните в Supabase SQL Editor (Dashboard → SQL).
--
-- Что делает этот скрипт:
--   1) Убирает старые политики, где «любой авторизованный = админ».
--   2) Создаёт функцию-проверку is_admin() — только конкретные email.
--   3) Заводит правильные политики для orders / admin_settings / policy_versions:
--      • Гость (anon): может ТОЛЬКО создать заявку (и обязательно с согласием).
--      • Гость (anon): может читать только публичную таблицу policy_versions.
--      • Админ: полный доступ к orders / admin_settings / policy_versions.
--      • Все остальные авторизованные пользователи (например, спам-регистрации) —
--        не имеют доступа ни к чему.
--
-- ВНИМАНИЕ: впишите ниже email(ы) администратора(ов).
-- =====================================================================

begin;

-- 1) Список email-адресов администраторов. Замените на свои!
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'email') in (
      'YOUR_ADMIN_EMAIL@example.com'   -- ← ВПИШИТЕ свой email из Supabase Auth
      -- ,'second-admin@example.com'   -- (можно перечислить через запятую)
    ),
    false
  );
$$;

-- =====================================================================
-- ORDERS — заявки (содержат ПДн)
-- =====================================================================
alter table public.orders enable row level security;

-- Сносим всё, что было раньше — чтобы случайно не остались дырявые политики.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='orders'
  loop
    execute format('drop policy if exists %I on public.orders', p.policyname);
  end loop;
end $$;

-- 1.1) anon может ТОЛЬКО вставлять заявку — и обязательно с согласием.
create policy orders_insert_anon
  on public.orders
  for insert
  to anon
  with check (
    privacy_consent = true
    and consent_at is not null
    and policy_version is not null
  );

-- 1.2) Авторизованный пользователь тоже может оставить заявку (если кто-то залогинен).
create policy orders_insert_auth
  on public.orders
  for insert
  to authenticated
  with check (
    privacy_consent = true
    and consent_at is not null
    and policy_version is not null
  );

-- 1.3) Читать / менять / удалять заявки — только админ.
create policy orders_select_admin
  on public.orders
  for select
  to authenticated
  using (public.is_admin());

create policy orders_update_admin
  on public.orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy orders_delete_admin
  on public.orders
  for delete
  to authenticated
  using (public.is_admin());

-- =====================================================================
-- ADMIN_SETTINGS — внутренние заметки админа
-- =====================================================================
alter table public.admin_settings enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='admin_settings'
  loop
    execute format('drop policy if exists %I on public.admin_settings', p.policyname);
  end loop;
end $$;

create policy admin_settings_select_admin
  on public.admin_settings
  for select
  to authenticated
  using (public.is_admin());

create policy admin_settings_modify_admin
  on public.admin_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- POLICY_VERSIONS — публичная политика конфиденциальности
-- =====================================================================
alter table public.policy_versions enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='policy_versions'
  loop
    execute format('drop policy if exists %I on public.policy_versions', p.policyname);
  end loop;
end $$;

-- Читать политику может кто угодно (для прозрачности перед клиентом).
create policy policy_versions_select_public
  on public.policy_versions
  for select
  to anon, authenticated
  using (true);

-- Менять — только админ.
create policy policy_versions_modify_admin
  on public.policy_versions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;

-- =====================================================================
-- ПРОВЕРКА: после применения скрипта запустите эти запросы и убедитесь,
-- что из anon/authenticated невозможно прочитать orders / admin_settings.
-- (Через Supabase Dashboard → Table Editor — RLS можно симулировать кнопкой
-- "Impersonate role".)
-- =====================================================================
