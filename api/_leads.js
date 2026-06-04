// Общий рендер сообщения заявки для Telegram (используется в lead.js и tg.js),
// чтобы текст и кнопка статуса были одинаковыми при создании и при переключении.

// Ссылка на вход в админку (для кнопок в уведомлениях). Публичный URL, не секрет.
const ADMIN_URL = 'https://mirokon-new.vercel.app/landing.html';

function fmtTime(ts) {
  try { return new Date(ts).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }); }
  catch (e) { return ''; }
}

function leadText(lead) {
  const status = lead.processed ? '✅ Обработана' : '🟡 Новая';
  let text = `🪟 Заявка #${String(lead.id).slice(0, 8)} · ${status}\n\n`
    + `👤 Имя: ${lead.name}\n`
    + `📞 Телефон: ${lead.phone}\n`;
  if (lead.message) {
    text += `💬 ${lead.message}\n`;
  }
  if (lead.cart_items && lead.cart_items.length) {
    let total = 0;
    text += `\n📋 Заказ (${lead.cart_items.length} поз.):\n`;
    lead.cart_items.forEach((item, i) => {
      total += item.price || 0;
      const specs = [item.profile, item.glass, item.hardware].filter(Boolean).join(' · ');
      text += `${i+1}. ${item.type || 'Окно'} — ${item.width}×${item.height} мм — ~${(item.price||0).toLocaleString('ru-RU')} ₽\n`;
      if (specs) text += `   🔧 ${specs}\n`;
    });
    text += `💰 Итого: ~${total.toLocaleString('ru-RU')} ₽\n`;
  }
  if (lead.created_at) text += `\n🕒 ${fmtTime(lead.created_at)}`;
  return text;
}

function leadKeyboard(lead) {
  const statusBtn = lead.processed
    ? { text: '↩️ Вернуть в работу', callback_data: `lundo:${lead.id}` }
    : { text: '✅ Обработана', callback_data: `ldone:${lead.id}` };
  return { inline_keyboard: [[statusBtn], [{ text: '🔧 Открыть админку', url: ADMIN_URL }]] };
}

module.exports = { leadText, leadKeyboard, ADMIN_URL };
