const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, rating, text } = req.body;

  if (!name || !rating || !text) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const botToken = process.env.TG_BOT_TOKEN || '8622267403:AAEfT3X67P2i3UJ0Ghkd-zomyQ0URN4q_aI';
  const chatId = '649175786';

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🗣 *Новый отзыв Mirokon на модерацию:*\n\n👤 Имя: ${name}\n⭐ Рейтинг: ${rating}/5\n💬 Отзыв: ${text}\n\n/approve_${Date.now()} или игнор`,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    if (!tgRes.ok) {
      throw new Error(`TG error: ${tgRes.status}`);
    }

    res.json({ success: true, message: 'Отзыв отправлен на модерацию в TG!' });
  } catch (error) {
    console.error('Review API error:', error);
    res.status(500).json({ error: 'Failed to send to TG' });
  }
};

module.exports = handler;