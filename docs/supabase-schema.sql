-- ============================================================
-- Mirokon — схема БД (Supabase / PostgreSQL)
-- Таблицы: works (работы), reviews (отзывы), news (новости)
-- Запустить в SQL Editor нового проекта или через MCP apply_migration.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Таблицы ----------
create table if not exists public.works (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,                       -- Гостиная / Балкон / ...
  description text,
  image_url   text,                        -- ссылка на фото в Storage
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

create index if not exists works_pub_idx   on public.works   (published, sort, created_at desc);
create index if not exists reviews_appr_idx on public.reviews (approved, created_at desc);
create index if not exists news_pub_idx     on public.news    (published, created_at desc);

-- ---------- RLS ----------
alter table public.works   enable row level security;
alter table public.reviews enable row level security;
alter table public.news    enable row level security;

-- Публичное чтение: только опубликованное / одобренное (анонимный ключ)
create policy "public read published works"  on public.works   for select using (published = true);
create policy "public read approved reviews" on public.reviews for select using (approved = true);
create policy "public read published news"   on public.news    for select using (published = true);

-- Полный доступ авторизованному админу (Supabase Auth)
create policy "auth manage works"   on public.works   for all to authenticated using (true) with check (true);
create policy "auth manage reviews" on public.reviews for all to authenticated using (true) with check (true);
create policy "auth manage news"    on public.news    for all to authenticated using (true) with check (true);

-- Примечание: отзывы посетителей пишет серверная функция (/api/review) с service_role,
-- она минует RLS и ставит approved=false. Поэтому анонимный INSERT-policy не нужен.

-- ---------- Storage (фото работ) ----------
insert into storage.buckets (id, name, public)
values ('works', 'works', true)
on conflict (id) do nothing;

-- читать фото может кто угодно (публичный бакет), загружать/удалять — только админ
create policy "public read works bucket" on storage.objects
  for select using (bucket_id = 'works');
create policy "auth write works bucket" on storage.objects
  for all to authenticated using (bucket_id = 'works') with check (bucket_id = 'works');

-- ---------- (опц.) демо-данные для проверки ----------
-- insert into public.works (title, category, description, published) values
--   ('Остекление гостиной','Гостиная','Двухкамерный стеклопакет',true);
-- insert into public.news (title, preview_text, published) values
--   ('Гарантия 5 лет','Расширили гарантию на монтаж',true);
