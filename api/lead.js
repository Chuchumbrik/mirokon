const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, message } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: 'Укажите имя и телефон' });
  }

  // Секреты только из ENV (тестовый токен — в Vercel ENV; сжечь перед релизом, DR-006).
  const botToken = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID || '649175786';
  if (!botToken) {
    return res.status(500).json({ error: 'Сервис временно недоступен. Позвоните нам напрямую.' });
  }

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
