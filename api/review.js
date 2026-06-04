// POST /api/review — приём отзыва: сохраняем в Supabase на модерацию (approved=false)
// и шлём уведомление в Telegram (best-effort).
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

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  // TODO (DR-003/DR-006): вынести TG-токен в ENV и сжечь тестовый перед релизом.
  const botToken = process.env.TG_BOT_TOKEN || '8622267403:AAEfT3X67P2i3UJ0Ghkd-zomyQ0URN4q_aI';
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
    try {
      const reply_markup = reviewId ? {
        inline_keyboard: [[
          { text: '✅ Одобрить', callback_data: `appr:${reviewId}` },
          { text: '🗑 Отклонить', callback_data: `rej:${reviewId}` }
        ]]
      } : undefined;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🗣 Новый отзыв Mirokon на модерацию:\n\n👤 ${name}${city ? ' · ' + city : ''}\n⭐ ${rating}/5\n💬 ${text}`,
          reply_markup,
          disable_web_page_preview: true
        })
      });
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
