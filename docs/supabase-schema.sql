-- ============================================================
-- Mirokon — схема БД (Supabase / PostgreSQL)
-- Таблицы: works (работы), reviews (отзывы), news (новости)
-- Запустить в SQL Editor нового проекта или через MCP apply_migration.
--
-- ПОСЛЕ запуска:
--   1) Authentication → Sign In/Providers → ОТКЛЮЧИТЬ публичную регистрацию
--      (Disable new sign-ups) — вход только для админа.
--   2) Authentication → Users → Add user (e-mail + пароль владельца).
--   3) Скопировать его UUID и выполнить:
--        insert into public.app_admins (user_id) values ('<UUID-админа>');
--      Без этого никто не сможет писать в таблицы/Storage (только чтение).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Таблицы ----------
create table if not exists public.works (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,                        -- Гостиная / Балкон / ...
  description text,
  image_url   text,                         -- ссылка на фото в Storage
  sort        int  not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_city text,
  rating      int  not null check (rating between 1 and 5),
  text        text not null,
  approved    boolean not null default false,   -- публикуется только после модерации
  tg_chat_id    text,                            -- сообщение модерации в Telegram (для правки из админки)
  tg_message_id bigint,
  created_at  timestamptz not null default now()
);

create table if not exists public.news (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  preview_text text,
  body         text,
  image_url    text,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists works_pub_idx    on public.works   (published, sort, created_at desc);
create index if not exists reviews_appr_idx  on public.reviews (approved, created_at desc);
create index if not exists news_pub_idx      on public.news    (published, created_at desc);

-- Заявки (лиды): хранятся для списка и статуса в боте. Доступ только service_role.
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null,
  message       text,
  processed     boolean not null default false,
  tg_chat_id    text,
  tg_message_id bigint,
  created_at    timestamptz not null default now()
);
create index if not exists leads_idx on public.leads (processed, created_at desc);
alter table public.leads enable row level security;  -- политик нет → публичного доступа нет

-- ---------- Админы и проверка роли ----------
create table if not exists public.app_admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
create policy "admin reads own admin row" on public.app_admins
  for select to authenticated using (user_id = auth.uid());

-- is_admin() = текущий пользователь есть в app_admins. SECURITY DEFINER,
-- чтобы обойти RLS самой app_admins при проверке.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.app_admins where user_id = auth.uid()) $$;

-- ---------- RLS ----------
alter table public.works   enable row level security;
alter table public.reviews enable row level security;
alter table public.news    enable row level security;

-- Публичное чтение: только опубликованное / одобренное (анонимный ключ)
create policy "public read published works"  on public.works   for select using (published = true);
create policy "public read approved reviews" on public.reviews for select using (approved = true);
create policy "public read published news"   on public.news    for select using (published = true);

-- Полный доступ ТОЛЬКО админу (чтение черновиков + запись/правка/удаление)
create policy "admin manage works"   on public.works   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage reviews" on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage news"    on public.news    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Примечание: отзывы посетителей пишет серверная функция (/api/review) с service_role —
-- она минует RLS и ставит approved=false. Анонимный INSERT-policy не нужен.

-- ---------- Storage (фото работ) ----------
insert into storage.buckets (id, name, public)
values ('works', 'works', true)
on conflict (id) do nothing;

-- читать фото может кто угодно (публичный бакет)
create policy "public read works bucket" on storage.objects
  for select using (bucket_id = 'works');
-- загрузка/правка/удаление — только админ, по командам отдельно
create policy "admin insert works bucket" on storage.objects
  for insert to authenticated with check (bucket_id = 'works' and public.is_admin());
create policy "admin update works bucket" on storage.objects
  for update to authenticated using (bucket_id = 'works' and public.is_admin()) with check (bucket_id = 'works' and public.is_admin());
create policy "admin delete works bucket" on storage.objects
  for delete to authenticated using (bucket_id = 'works' and public.is_admin());

-- ---------- (опц.) демо-данные для проверки ----------
-- insert into public.works (title, category, description, published) values
--   ('Остекление гостиной','Гостиная','Двухкамерный стеклопакет',true);
-- insert into public.news (title, preview_text, published) values
--   ('Гарантия 5 лет','Расширили гарантию на монтаж',true);
