// POST /api/moderate — действия модерации ИЗ АДМИНКИ с синхронизацией Telegram.
// Админка вызывает с Bearer-JWT текущей сессии. Эндпойнт:
//   1) проверяет, что вызвавший — админ (RPC is_admin от имени пользователя),
//   2) применяет действие через service_role,
//   3) редактирует соответствующее сообщение в Telegram.
//
// Тело:
//   отзыв:  { type?: 'review', id, action: 'approve' | 'reject' }
//   заявка: { type: 'lead',    id, action: 'process' | 'unprocess' | 'delete' }
const { leadText, leadKeyboard } = require('./_leads');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = { review: ['approve', 'reject'], lead: ['process', 'unprocess', 'delete'] };

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return res.status(401).json({ error: 'unauthorized' });

  const { id, action } = req.body || {};
  const type = (req.body && req.body.type) || 'review';
  if (!UUID_RE.test(id || '') || !ACTIONS[type] || !ACTIONS[type].includes(action)) {
    return res.status(400).json({ error: 'bad request' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K';
  const botToken = process.env.TG_BOT_TOKEN;
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'not configured' });

  const svc = { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
  const tgEdit = (body) => fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disable_web_page_preview: true, ...body })
  }).catch((e) => console.error('TG edit failed:', e.message));

  try {
    // 1) Проверка прав: is_admin() от имени пользователя (по его JWT)
    const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${jwt}` },
      body: '{}'
    });
    const isAdmin = await adminRes.json().catch(() => false);
    if (!adminRes.ok || isAdmin !== true) return res.status(403).json({ error: 'forbidden' });

    if (type === 'review') return await handleReview({ res, svc, tgEdit, botToken, SUPABASE_URL, id, action });
    return await handleLead({ res, svc, tgEdit, botToken, SUPABASE_URL, id, action });
  } catch (error) {
    console.error('Moderate API error:', error);
    res.status(500).json({ error: 'Не удалось выполнить действие' });
  }
};

async function handleReview({ res, svc, tgEdit, botToken, SUPABASE_URL, id, action }) {
  const g = await fetch(
    `${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}&select=author_name,author_city,rating,text,tg_chat_id,tg_message_id`,
    { headers: svc }
  );
  const rows = g.ok ? await g.json().catch(() => []) : [];
  const review = rows && rows[0];
  if (!review) return res.status(404).json({ error: 'not found' });

  if (action === 'approve') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, {
      method: 'PATCH', headers: { ...svc, Prefer: 'return=minimal' }, body: JSON.stringify({ approved: true })
    });
    if (!r.ok) throw new Error(`DB approve ${r.status}`);
  } else {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, { method: 'DELETE', headers: { ...svc, Prefer: 'return=minimal' } });
    if (!r.ok) throw new Error(`DB delete ${r.status}`);
  }

  if (botToken && review.tg_chat_id && review.tg_message_id) {
    const note = action === 'approve' ? '✅ Одобрено в админке' : '🗑 Отклонено в админке';
    const base = `🗣 Новый отзыв Mirokon на модерацию:\n\n👤 ${review.author_name}` +
      `${review.author_city ? ' · ' + review.author_city : ''}\n⭐ ${review.rating}/5\n💬 ${review.text}`;
    await tgEdit({ chat_id: review.tg_chat_id, message_id: review.tg_message_id, text: base + '\n\n— ' + note, reply_markup: { inline_keyboard: [] } });
  }
  return res.json({ success: true });
}

async function handleLead({ res, svc, tgEdit, botToken, SUPABASE_URL, id, action }) {
  const g = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?id=eq.${id}&select=id,name,phone,message,processed,created_at,tg_chat_id,tg_message_id`,
    { headers: svc }
  );
  const rows = g.ok ? await g.json().catch(() => []) : [];
  const lead = rows && rows[0];
  if (!lead) return res.status(404).json({ error: 'not found' });

  if (action === 'delete') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, { method: 'DELETE', headers: { ...svc, Prefer: 'return=minimal' } });
    if (!r.ok) throw new Error(`DB delete ${r.status}`);
    if (botToken && lead.tg_chat_id && lead.tg_message_id) {
      await tgEdit({ chat_id: lead.tg_chat_id, message_id: lead.tg_message_id, text: leadText(lead) + '\n\n— 🗑 Удалена в админке', reply_markup: { inline_keyboard: [] } });
    }
    return res.json({ success: true });
  }

  const processed = action === 'process';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
    method: 'PATCH', headers: { ...svc, Prefer: 'return=representation' }, body: JSON.stringify({ processed })
  });
  if (!r.ok) throw new Error(`DB lead ${r.status}`);
  const updated = (await r.json().catch(() => []))[0] || { ...lead, processed };
  if (botToken && updated.tg_chat_id && updated.tg_message_id) {
    await tgEdit({ chat_id: updated.tg_chat_id, message_id: updated.tg_message_id, text: leadText(updated), reply_markup: leadKeyboard(updated) });
  }
  return res.json({ success: true });
}

module.exports = handler;
