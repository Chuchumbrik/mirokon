-- ============================================================
-- Mirokon — справочник категорий работ (DR-008, вариант B).
-- works.category остаётся текстом; categories управляет списком, порядком,
-- переименованием и удалением. Запустить ОДИН РАЗ в проекте mirokon.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
-- публичное чтение (фронт строит упорядоченные чипы)
create policy "public read categories" on public.categories for select using (true);
-- управление — только админ
create policy "admin manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- сид из уже существующих категорий works
insert into public.categories (name, sort)
select category, (row_number() over (order by category)) - 1
from (select distinct category from public.works where category is not null) s
on conflict (name) do nothing;
