// POST /api/lead — приём заявки: уведомление в Telegram + (опц.) дубль на e-mail.
const { checkRateLimit, getClientIp } = require('./_ratelimit');

// Дубль лида на e-mail через Resend — активируется, когда заданы ENV
// RESEND_API_KEY, LEAD_EMAIL_TO, LEAD_EMAIL_FROM (иначе тихо пропускается).
async function emailDubl({ name, phone, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  if (!apiKey || !to || !from) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from, to,
        subject: `Новая заявка Mirokon: ${name}`,
        text: `Имя: ${name}\nТелефон: ${phone}\n` + (message ? `Сообщение: ${message}\n` : '')
      })
    });
  } catch (e) {
    console.error('Email dubl failed:', e.message);
  }
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { name, phone, message } = req.body || {};
  name = (name || '').toString().trim().slice(0, 80);
  phone = (phone || '').toString().trim().slice(0, 32);
  message = (message || '').toString().trim().slice(0, 2000);

  if (!name || !phone) {
    return res.status(400).json({ error: 'Укажите имя и телефон' });
  }

  // Rate-limit: не более 5 заявок/час с одного IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit('lead', ip, { max: 5, windowSeconds: 3600 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Слишком много заявок. Попробуйте позже или позвоните нам напрямую.' });
  }

  // Секреты только из ENV (тестовый токен — в Vercel ENV; сжечь перед релизом, DR-006).
  const botToken = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID || '649175786';
  if (!botToken) {
    return res.status(500).json({ error: 'Сервис временно недоступен. Позвоните нам напрямую.' });
  }

  // Без parse_mode — спецсимволы в пользовательском вводе (*, _, [, `) не ломают
  // разбор Markdown в Telegram (иначе 400 и потерянный лид).
  const text =
    `🪟 Новая заявка с сайта Mirokon\n\n` +
    `👤 Имя: ${name}\n` +
    `📞 Телефон: ${phone}\n` +
    (message ? `💬 Сообщение: ${message}\n` : '') +
    `\n🕒 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
    });

    if (!tgRes.ok) {
      throw new Error(`TG error: ${tgRes.status}`);
    }

    // Дубль на e-mail (best-effort, не валит заявку при ошибке)
    await emailDubl({ name, phone, message });

    res.json({ success: true, message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.' });
  } catch (error) {
    console.error('Lead API error:', error);
    res.status(500).json({ error: 'Не удалось отправить заявку. Попробуйте позвонить.' });
  }
};

module.exports = handler;
