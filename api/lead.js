// POST /api/lead — приём заявки: сохранить в БД, уведомить в Telegram (с кнопкой
// статуса) и продублировать на e-mail.
const { checkRateLimit, getClientIp } = require('./_ratelimit');
const { leadText, leadKeyboard } = require('./_leads');

// Дубль лида на e-mail через Resend — активируется, когда заданы ENV
// RESEND_API_KEY, LEAD_EMAIL_TO, LEAD_EMAIL_FROM (иначе тихо пропускается).
async function emailDubl({ name, phone, message, cart_items }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  if (!apiKey || !to || !from) return;
  let cartText = '';
  if (cart_items && cart_items.length) {
    let total = 0;
    cartText = '\n\nСостав заказа:\n';
    cart_items.forEach((item, i) => {
      total += item.price || 0;
      cartText += `${i+1}. ${item.type}  ${item.width}×${item.height} мм  ~${(item.price||0).toLocaleString('ru-RU')} ₽\n`;
    });
    cartText += `Итого: ~${total.toLocaleString('ru-RU')} ₽`;
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from, to,
        subject: `Новая заявка Mirokon: ${name}`,
        text: `Имя: ${name}\nТелефон: ${phone}\n` + (message ? `Сообщение: ${message}\n` : '') + cartText
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

  let { name, phone, message, cart_items } = req.body || {};
  name = (name || '').toString().trim().slice(0, 80);
  phone = (phone || '').toString().trim().slice(0, 32);
  message = (message || '').toString().trim().slice(0, 2000);
  cart_items = Array.isArray(cart_items) ? cart_items.slice(0, 50) : null;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Укажите имя и телефон' });
  }

  // Rate-limit: не более 5 заявок/час с одного IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit('lead', ip, { max: 5, windowSeconds: 3600 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Слишком много заявок. Попробуйте позже или позвоните нам напрямую.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  // Секреты только из ENV (тестовый токен — в Vercel ENV; сжечь перед релизом, DR-006).
  const botToken = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID || '649175786';
  if (!botToken) {
    return res.status(500).json({ error: 'Сервис временно недоступен. Позвоните нам напрямую.' });
  }

  const svc = { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  try {
    // 1) Сохраняем заявку в БД (service_role минует RLS) — best-effort
    let lead = null;
    if (SUPABASE_URL && SERVICE_KEY) {
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST', headers: { ...svc, Prefer: 'return=representation' },
        body: JSON.stringify({ name, phone, message: message || null, cart_items: cart_items || null })
      });
      if (dbRes.ok) {
        const rows = await dbRes.json().catch(() => []);
        lead = rows && rows[0];
      } else {
        console.error('Lead DB insert failed:', dbRes.status, await dbRes.text().catch(() => ''));
      }
    }

    // 2) Уведомление в Telegram — с кнопкой статуса, если заявка сохранена в БД.
    // Без parse_mode: спецсимволы в вводе не ломают разбор и не теряют лид.
    const text = lead ? leadText(lead) :
      `🪟 Новая заявка с сайта Mirokon\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n` +
      (message ? `💬 Сообщение: ${message}\n` : '') +
      `\n🕒 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, text,
        reply_markup: lead ? leadKeyboard(lead) : undefined,
        disable_web_page_preview: true
      })
    });
    if (!tgRes.ok) {
      throw new Error(`TG error: ${tgRes.status}`);
    }

    // Сохраняем message_id, чтобы кнопка/список бота могли редактировать это сообщение
    if (lead && SUPABASE_URL && SERVICE_KEY) {
      const j = await tgRes.json().catch(() => null);
      const mid = j && j.ok && j.result && j.result.message_id;
      const cid = j && j.result && j.result.chat && j.result.chat.id;
      if (mid) {
        await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
          method: 'PATCH', headers: { ...svc, Prefer: 'return=minimal' },
          body: JSON.stringify({ tg_chat_id: String(cid), tg_message_id: mid })
        });
      }
    }

    // 3) Дубль на e-mail (best-effort, не валит заявку при ошибке)
    await emailDubl({ name, phone, message, cart_items });

    res.json({ success: true, message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.' });
  } catch (error) {
    console.error('Lead API error:', error);
    res.status(500).json({ error: 'Не удалось отправить заявку. Попробуйте позвонить.' });
  }
};

module.exports = handler;
