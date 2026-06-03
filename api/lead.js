const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, message } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: 'Укажите имя и телефон' });
  }

  // TODO (DR-003/DR-006): перед публичным релизом вынести токен в ENV Vercel
  // и сжечь текущий тестовый токен. На время тестов оставлен fallback.
  const botToken = process.env.TG_BOT_TOKEN || '8622267403:AAEfT3X67P2i3UJ0Ghkd-zomyQ0URN4q_aI';
  const chatId = process.env.TG_CHAT_ID || '649175786';

  const text =
    `🪟 *Новая заявка с сайта Mirokon*\n\n` +
    `👤 Имя: ${name}\n` +
    `📞 Телефон: ${phone}\n` +
    (message ? `💬 Сообщение: ${message}\n` : '') +
    `\n🕒 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    if (!tgRes.ok) {
      throw new Error(`TG error: ${tgRes.status}`);
    }

    // TODO: продублировать лид на email (Resend/SMTP), когда будет ключ —
    // адрес для тестов: mussha2013@gmail.com

    res.json({ success: true, message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.' });
  } catch (error) {
    console.error('Lead API error:', error);
    res.status(500).json({ error: 'Не удалось отправить заявку. Попробуйте позвонить.' });
  }
};

module.exports = handler;
