-- ============================================================
-- Mirokon — связь отзыва с его сообщением модерации в Telegram.
-- Нужна, чтобы модерация ИЗ АДМИНКИ тоже редактировала сообщение в чате
-- (убирала кнопки + дописывала пометку). Запустить ОДИН РАЗ в проекте mirokon.
-- ============================================================

alter table public.reviews add column if not exists tg_chat_id    text;
alter table public.reviews add column if not exists tg_message_id bigint;
