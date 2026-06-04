-- ============================================================
-- Mirokon — rate-limit для публичных форм (/api/lead, /api/review)
-- Запустить в SQL Editor проекта mirokon (ermeokjqkzpkefqtmvif)
-- ОДИН РАЗ, как и supabase-schema.sql.
--
-- Хранилище попыток по IP + endpoint. Серверные функции (service_role)
-- вызывают RPC check_rate_limit(), которая считает попытки в окне и
-- записывает текущую. Таблица закрыта RLS — доступ только service_role.
-- ============================================================

create table if not exists public.rate_limits (
  id         bigint generated always as identity primary key,
  ip         text not null,
  endpoint   text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx
  on public.rate_limits (ip, endpoint, created_at desc);

-- RLS включён, политик нет → anon/authenticated не видят таблицу.
-- service_role (серверные функции) обходит RLS.
alter table public.rate_limits enable row level security;

-- check_rate_limit: возвращает true, если запрос РАЗРЕШЁН (и тогда записывает попытку),
-- false — если лимит p_max за окно p_window_seconds уже исчерпан.
create or replace function public.check_rate_limit(
  p_ip text,
  p_endpoint text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  -- лёгкая уборка устаревших записей (вне окна × 4)
  delete from public.rate_limits
   where created_at < now() - make_interval(secs => p_window_seconds * 4);

  select count(*) into cnt
    from public.rate_limits
   where ip = p_ip
     and endpoint = p_endpoint
     and created_at > now() - make_interval(secs => p_window_seconds);

  if cnt >= p_max then
    return false;
  end if;

  insert into public.rate_limits (ip, endpoint) values (p_ip, p_endpoint);
  return true;
end;
$$;
