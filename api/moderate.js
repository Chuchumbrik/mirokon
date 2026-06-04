// POST /api/moderate — модерация отзыва ИЗ АДМИНКИ с синхронизацией Telegram.
// Админка вызывает с Bearer-JWT текущей сессии. Эндпойнт:
//   1) проверяет, что вызвавший — админ (RPC is_admin от имени пользователя),
//   2) применяет действие через service_role (approve → approved=true, reject → delete),
//   3) редактирует сообщение модерации в Telegram: убирает кнопки + дописывает пометку.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return res.status(401).json({ error: 'unauthorized' });

  const { id, action } = req.body || {};
  if (!UUID_RE.test(id || '') || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'bad request' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K';
  const botToken = process.env.TG_BOT_TOKEN;
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'not configured' });

  const svc = { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  try {
    // 1) Проверка прав: is_admin() выполняется от имени пользователя (по его JWT)
    const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${jwt}` },
      body: '{}'
    });
    const isAdmin = await adminRes.json().catch(() => false);
    if (!adminRes.ok || isAdmin !== true) return res.status(403).json({ error: 'forbidden' });

    // 2) Достаём отзыв ДО изменения (нужны поля для восстановления текста сообщения)
    const g = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}&select=author_name,author_city,rating,text,tg_chat_id,tg_message_id`,
      { headers: svc }
    );
    const rows = g.ok ? await g.json().catch(() => []) : [];
    const review = rows && rows[0];
    if (!review) return res.status(404).json({ error: 'not found' });

    // 3) Применяем действие через service_role
    if (action === 'approve') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, {
        method: 'PATCH', headers: { ...svc, Prefer: 'return=minimal' }, body: JSON.stringify({ approved: true })
      });
      if (!r.ok) throw new Error(`DB approve ${r.status}`);
    } else {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, {
        method: 'DELETE', headers: { ...svc, Prefer: 'return=minimal' }
      });
      if (!r.ok) throw new Error(`DB delete ${r.status}`);
    }

    // 4) Редактируем сообщение модерации в Telegram (best-effort)
    if (botToken && review.tg_chat_id && review.tg_message_id) {
      const note = action === 'approve' ? '✅ Одобрено в админке' : '🗑 Отклонено в админке';
      const base = `🗣 Новый отзыв Mirokon на модерацию:\n\n👤 ${review.author_name}` +
        `${review.author_city ? ' · ' + review.author_city : ''}\n⭐ ${review.rating}/5\n💬 ${review.text}`;
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: review.tg_chat_id,
            message_id: review.tg_message_id,
            text: base + '\n\n— ' + note,
            reply_markup: { inline_keyboard: [] }, // убрать кнопки
            disable_web_page_preview: true
          })
        });
      } catch (e) {
        console.error('TG edit failed:', e.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Moderate API error:', error);
    res.status(500).json({ error: 'Не удалось выполнить действие' });
  }
};

module.exports = handler;
