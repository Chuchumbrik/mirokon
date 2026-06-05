-- ============================================================
-- Mirokon — ужесточение RLS на work_photos (QA-находка).
-- Было: публичное чтение ВСЕХ фото (включая работы-черновики).
-- Стало: аноним читает фото только ОПУБЛИКОВАННЫХ работ.
-- Админ (authenticated + is_admin) по-прежнему видит всё через "admin manage".
-- Запустить ОДИН РАЗ в проекте mirokon.
-- ============================================================

drop policy if exists "public read work_photos" on public.work_photos;
create policy "public read work_photos of published" on public.work_photos
  for select using (
    exists (select 1 from public.works w where w.id = work_photos.work_id and w.published = true)
  );
