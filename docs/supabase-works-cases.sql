-- ============================================================
-- Mirokon — works как объекты-кейсы (DR-008).
-- Добавляет поля кейса: перечень работ, система, срок, район, гарантия,
-- цена «от», и тип окна-шаблон для кнопки «Рассчитать для моей квартиры».
-- Фото объекта — в существующей таблице work_photos.
-- Запустить ОДИН РАЗ в проекте mirokon.
-- ============================================================

alter table public.works add column if not exists scope           text[];   -- перечень работ «под ключ»
alter table public.works add column if not exists system          text;     -- профиль (VEKA/REHAU/…)
alter table public.works add column if not exists duration_days   int;      -- срок работ, дней
alter table public.works add column if not exists area            text;     -- район/город
alter table public.works add column if not exists warranty        text;     -- гарантия
alter table public.works add column if not exists price_from      int;      -- ориентир «от X ₽» (НЕ точная смета)
alter table public.works add column if not exists tpl_window_type text;     -- тип окна для предзаполнения конструктора
