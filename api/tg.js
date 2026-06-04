// Telegram webhook: модерация отзывов и обработка заявок прямо в чате админа.
//  • Отзывы: callback appr:<id> / rej:<id> — одобрить (публикует) / отклонить (удаляет).
//  • Заявки: callback ldone:<id> / lundo:<id> — отметить обработанной / вернуть в работу.
//  • Команда /leads — список необработанных заявок (только админу).
// Проверяет секрет вебхука и что действие инициировал админ.
const { leadText, leadKeyboard } = require('./_leads');

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Проверка секрета вебхука (fail-closed: без секрета не обрабатываем)
  const secret = process.env.TG_WEBHOOK_SECRET;
  if (!secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const botToken = process.env.TG_BOT_TOKEN;
  const adminChat = process.env.TG_CHAT_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!botToken || !adminChat) return res.status(500).json({ error: 'not configured' });
  const hasDb = !!(SUPABASE_URL && SERVICE_KEY);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

      // ----- Заявки: переключение статуса (правим сообщение, кнопка остаётся) -----
      if ((action === 'ldone' || action === 'lundo') && UUID_RE.test(id) && hasDb) {
        const processed = action === 'ldone';
        const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
          method: 'PATCH', headers: { ...dbHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({ processed })
        });
        const rows = r.ok ? await r.json().catch(() => []) : [];
        const lead = rows && rows[0];
        if (lead) {
          await tg('answerCallbackQuery', { callback_query_id: cq.id, text: processed ? '✅ Обработана' : '↩️ Возвращено в работу' });
          if (cq.message) {
            await tg('editMessageText', {
              chat_id: cq.message.chat.id, message_id: cq.message.message_id,
              text: leadText(lead), reply_markup: leadKeyboard(lead), disable_web_page_preview: true
            });
          }
        } else {
          await tg('answerCallbackQuery', { callback_query_id: cq.id, text: '⚠️ Заявка не найдена' });
        }
        return res.json({ ok: true });
      }

      // ----- Отзывы: одобрить / отклонить (кнопки убираются, дописывается итог) -----
      let result = 'Неизвестное действие';
      if ((action === 'appr' || action === 'rej') && UUID_RE.test(id) && hasDb) {
        const r = action === 'appr'
          // approved=is.false: повторный клик по уже одобренному ничего не делает
          ? await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}&approved=is.false`, { method: 'PATCH', headers: dbHeaders, body: JSON.stringify({ approved: true }) })
          : await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, { method: 'DELETE', headers: dbHeaders });
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
    if (msg && typeof msg.text === 'string') {
      const text = msg.text.trim();
      const fromId = String(msg.from && msg.from.id);

      if (text.startsWith('/start')) {
        await tg('sendMessage', {
          chat_id: msg.chat.id,
          text: 'Бот Mirokon.\n\n• Новые отзывы приходят с кнопками «Одобрить» / «Отклонить».\n• Новые заявки приходят с кнопкой «✅ Обработана».\n• /leads — список необработанных заявок.'
        });
      } else if (text === '/leads' || text.startsWith('/leads ') || text === '/zayavki') {
        if (fromId !== adminChat) {
          await tg('sendMessage', { chat_id: msg.chat.id, text: 'Команда доступна только администратору.' });
          return res.json({ ok: true });
        }
        if (!hasDb) {
          await tg('sendMessage', { chat_id: msg.chat.id, text: 'База данных не настроена.' });
          return res.json({ ok: true });
        }
        const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?processed=eq.false&select=*&order=created_at.desc&limit=15`, { headers: dbHeaders });
        const leads = r.ok ? await r.json().catch(() => []) : [];
        if (!leads.length) {
          await tg('sendMessage', { chat_id: msg.chat.id, text: 'Новых заявок нет — всё обработано ✅' });
          return res.json({ ok: true });
        }
        await tg('sendMessage', { chat_id: msg.chat.id, text: `📋 Необработанных заявок: ${leads.length}` });
        for (const lead of leads) {
          await tg('sendMessage', { chat_id: msg.chat.id, text: leadText(lead), reply_markup: leadKeyboard(lead), disable_web_page_preview: true });
        }
        return res.json({ ok: true });
      }
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('tg webhook error:', e);
    return res.json({ ok: true }); // всегда 200, чтобы Telegram не зациклил ретраи
  }
};

module.exports = handler;
