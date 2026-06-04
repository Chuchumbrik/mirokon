// Telegram webhook: модерация отзывов кнопками прямо в чате админа.
// Принимает callback_query вида appr:<id> / rej:<id>, проверяет, что нажал админ,
// и обновляет/удаляет отзыв в Supabase через service_role.
const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Проверка секрета вебхука (Telegram шлёт его заголовком)
  const secret = process.env.TG_WEBHOOK_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const botToken = process.env.TG_BOT_TOKEN || '8622267403:AAEfT3X67P2i3UJ0Ghkd-zomyQ0URN4q_aI';
  const adminChat = String(process.env.TG_CHAT_ID || '649175786');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const tg = (method, body) => fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const dbHeaders = { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' };

  try {
    const update = req.body || {};
    const cq = update.callback_query;

    if (cq) {
      const fromId = String(cq.from && cq.from.id);
      const data = String(cq.data || '');
      if (fromId !== adminChat) {
        await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Нет прав на модерацию', show_alert: true });
        return res.json({ ok: true });
      }
      const sep = data.indexOf(':');
      const action = sep > 0 ? data.slice(0, sep) : data;
      const id = sep > 0 ? data.slice(sep + 1) : '';
      let result = 'Неизвестное действие';
      if ((action === 'appr' || action === 'rej') && id && SUPABASE_URL && SERVICE_KEY) {
        const url = `${SUPABASE_URL}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`;
        const r = action === 'appr'
          ? await fetch(url, { method: 'PATCH', headers: dbHeaders, body: JSON.stringify({ approved: true }) })
          : await fetch(url, { method: 'DELETE', headers: dbHeaders });
        result = r.ok ? (action === 'appr' ? '✅ Одобрено и опубликовано' : '🗑 Отклонено и удалено') : '⚠️ Ошибка БД';
      }
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: result });
      if (cq.message) {
        await tg('editMessageText', {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          text: (cq.message.text || '') + '\n\n— ' + result,
          reply_markup: { inline_keyboard: [] }
        });
      }
      return res.json({ ok: true });
    }

    const msg = update.message;
    if (msg && typeof msg.text === 'string' && msg.text.startsWith('/start')) {
      await tg('sendMessage', { chat_id: msg.chat.id, text: 'Бот Mirokon. Сюда приходят новые отзывы с кнопками модерации: «Одобрить» публикует отзыв на сайте, «Отклонить» удаляет.' });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('tg webhook error:', e);
    return res.json({ ok: true }); // всегда 200, чтобы Telegram не зациклил ретраи
  }
};

module.exports = handler;
