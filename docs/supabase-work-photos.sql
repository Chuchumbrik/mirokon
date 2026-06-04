-- Добавление таблицы work_photos (несколько фото на работу)
-- Применено 2026-06-04 через Management API

create table if not exists public.work_photos (
  id         uuid primary key default gen_random_uuid(),
  work_id    uuid not null references public.works(id) on delete cascade,
  url        text not null,
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists work_photos_idx on public.work_photos (work_id, sort);
alter table public.work_photos enable row level security;

-- Публичное чтение: только фото опубликованных работ
create policy "public read work_photos" on public.work_photos
  for select using (
    exists (select 1 from public.works w where w.id = work_id and w.published = true)
  );

-- Полный доступ только админу
create policy "admin manage work_photos" on public.work_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2026-06-04: добавлена колонка для хранения пути в Storage (без URL-парсинга)
alter table public.work_photos add column if not exists storage_path text;
