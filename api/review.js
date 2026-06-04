// POST /api/review — приём отзыва: сохраняем в Supabase на модерацию (approved=false)
// и шлём уведомление в Telegram (best-effort).
const { checkRateLimit, getClientIp } = require('./_ratelimit');
const { ADMIN_URL } = require('./_leads');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { name, rating, text, city } = req.body || {};
  name = (name || '').toString().trim().slice(0, 80);
  text = (text || '').toString().trim().slice(0, 2000);
  city = (city || '').toString().trim().slice(0, 80);
  rating = parseInt(rating, 10);
  if (!name || !text || !(rating >= 1 && rating <= 5)) {
    return res.status(400).json({ error: 'Заполните имя, текст и рейтинг (1–5)' });
  }

  // Rate-limit: не более 3 отзывов/час с одного IP (ТЗ 5.2)
  const ip = getClientIp(req);
  const rl = await checkRateLimit('review', ip, { max: 3, windowSeconds: 3600 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Слишком много отзывов. Попробуйте позже.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  // Секреты только из ENV (тестовый токен — в Vercel ENV; сжечь перед релизом, DR-006).
  const botToken = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID || '649175786';

  try {
    // 1) Сохраняем в БД на модерацию (service_role минует RLS, approved=false)
    let reviewId = null;
    if (SUPABASE_URL && SERVICE_KEY) {
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ author_name: name, author_city: city || null, rating, text, approved: false })
      });
      if (!dbRes.ok) {
        throw new Error(`DB error ${dbRes.status}: ${await dbRes.text()}`);
      }
      const rows = await dbRes.json();
      reviewId = rows && rows[0] && rows[0].id;
    }

    // 2) Уведомление в Telegram с кнопками модерации — best-effort, без parse_mode
    if (botToken) try {
      const adminRow = [{ text: '🔧 Открыть админку', url: ADMIN_URL }];
      const reply_markup = reviewId ? {
        inline_keyboard: [[
          { text: '✅ Одобрить', callback_data: `appr:${reviewId}` },
          { text: '🗑 Отклонить', callback_data: `rej:${reviewId}` }
        ], adminRow]
      } : { inline_keyboard: [adminRow] };
      const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🗣 Новый отзыв Mirokon на модерацию:\n\n👤 ${name}${city ? ' · ' + city : ''}\n⭐ ${rating}/5\n💬 ${text}`,
          reply_markup,
          disable_web_page_preview: true
        })
      });
      // Сохраняем message_id, чтобы модерация из админки могла отредактировать это сообщение
      if (reviewId && SUPABASE_URL && SERVICE_KEY) {
        const tgJson = await tgResp.json().catch(() => null);
        const mid = tgJson && tgJson.ok && tgJson.result && tgJson.result.message_id;
        const cid = tgJson && tgJson.result && tgJson.result.chat && tgJson.result.chat.id;
        if (mid) {
          await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${reviewId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
            body: JSON.stringify({ tg_chat_id: String(cid), tg_message_id: mid })
          });
        }
      }
    } catch (e) {
      console.error('TG notify failed:', e.message);
    }

    res.json({ success: true, message: 'Спасибо! Отзыв отправлен на модерацию.' });
  } catch (error) {
    console.error('Review API error:', error);
    res.status(500).json({ error: 'Не удалось сохранить отзыв. Попробуйте позже.' });
  }
};

module.exports = handler;
