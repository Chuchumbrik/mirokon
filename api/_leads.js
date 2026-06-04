// Общий рендер сообщения заявки для Telegram (используется в lead.js и tg.js),
// чтобы текст и кнопка статуса были одинаковыми при создании и при переключении.

function fmtTime(ts) {
  try { return new Date(ts).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }); }
  catch (e) { return ''; }
}

function leadText(lead) {
  const status = lead.processed ? '✅ Обработана' : '🟡 Новая';
  return `🪟 Заявка #${String(lead.id).slice(0, 8)} · ${status}\n\n` +
    `👤 Имя: ${lead.name}\n` +
    `📞 Телефон: ${lead.phone}\n` +
    (lead.message ? `💬 Сообщение: ${lead.message}\n` : '') +
    (lead.created_at ? `\n🕒 ${fmtTime(lead.created_at)}` : '');
}

function leadKeyboard(lead) {
  return lead.processed
    ? { inline_keyboard: [[{ text: '↩️ Вернуть в работу', callback_data: `lundo:${lead.id}` }]] }
    : { inline_keyboard: [[{ text: '✅ Обработана', callback_data: `ldone:${lead.id}` }]] };
}

module.exports = { leadText, leadKeyboard };
