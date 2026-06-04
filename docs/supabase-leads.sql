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

-- RLS включён, политик нет → anon/authenticated не видят таблицу.
-- service_role (серверные функции) обходит RLS.
alter table public.leads enable row level security;
