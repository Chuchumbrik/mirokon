-- ============================================================
-- Mirokon — хранение заявок (лидов) для списка и статуса в боте.
-- Доступ только service_role (серверные функции/бот). Публичного доступа НЕТ
-- (телефоны — ПДн). Сайт пишет заявки через /api/lead (service_role).
-- Запустить ОДИН РАЗ в проекте mirokon.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null,
  message       text,
  processed     boolean not null default false,   -- обработана менеджером
  tg_chat_id    text,                              -- сообщение-уведомление в Telegram
  tg_message_id bigint,
  created_at    timestamptz not null default now()
);

create index if not exists leads_idx on public.leads (processed, created_at desc);

-- RLS включён. service_role (серверные функции) обходит RLS и пишет заявки.
alter table public.leads enable row level security;

-- Админ может ЧИТАТЬ заявки в админке (запись/удаление — через /api/moderate
-- на service_role, чтобы синхронизировать сообщение в Telegram).
drop policy if exists "admin read leads" on public.leads;
create policy "admin read leads" on public.leads
  for select to authenticated using (public.is_admin());
