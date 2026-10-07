<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
cors_and_methods(['POST', 'OPTIONS']);
require_method('POST');

global $CONFIG;
$secret = (string)($CONFIG['tg_webhook_secret'] ?? '');
$header = (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '');
if ($secret === '' || !hash_equals($secret, $header)) {
    json_response(['error' => 'unauthorized'], 401);
}

if (!tg_enabled() || tg_chat_id() === '') {
    json_response(['error' => 'not configured'], 500);
}

$update = json_body();
$uuidRe = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
$adminChat = tg_chat_id();

try {
    if (!empty($update['callback_query'])) {
        $cq = $update['callback_query'];
        $fromId = (string)($cq['from']['id'] ?? '');
        $data = (string)($cq['data'] ?? '');
        if ($fromId !== $adminChat) {
            tg_api('answerCallbackQuery', [
                'callback_query_id' => $cq['id'],
                'text' => 'Нет прав на модерацию',
                'show_alert' => true,
            ]);
            json_response(['ok' => true]);
        }
        $sep = strpos($data, ':');
        $action = $sep !== false ? substr($data, 0, $sep) : $data;
        $id = $sep !== false ? substr($data, $sep + 1) : '';

        if (($action === 'ldone' || $action === 'lundo') && preg_match($uuidRe, $id)) {
            $processed = $action === 'ldone' ? 1 : 0;
            db()->prepare('UPDATE leads SET processed = ? WHERE id = ?')->execute([$processed, $id]);
            $s = db()->prepare('SELECT * FROM leads WHERE id = ?');
            $s->execute([$id]);
            $lead = $s->fetch();
            if ($lead) {
                $lead['cart_items'] = decode_json_col($lead['cart_items']);
                $lead['processed'] = (bool)$lead['processed'];
                tg_api('answerCallbackQuery', [
                    'callback_query_id' => $cq['id'],
                    'text' => $processed ? '✅ Обработана' : '↩️ Возвращено в работу',
                ]);
                if (!empty($cq['message'])) {
                    tg_api('editMessageText', [
                        'chat_id' => $cq['message']['chat']['id'],
                        'message_id' => $cq['message']['message_id'],
                        'text' => lead_text($lead),
                        'reply_markup' => lead_keyboard($lead),
                        'disable_web_page_preview' => true,
                    ]);
                }
            } else {
                tg_api('answerCallbackQuery', ['callback_query_id' => $cq['id'], 'text' => '⚠️ Заявка не найдена']);
            }
            json_response(['ok' => true]);
        }

        $result = 'Неизвестное действие';
        if (($action === 'appr' || $action === 'rej') && preg_match($uuidRe, $id)) {
            if ($action === 'appr') {
                $r = db()->prepare('UPDATE reviews SET approved = 1 WHERE id = ? AND approved = 0');
                $r->execute([$id]);
                $result = $r->rowCount() ? '✅ Одобрено и опубликовано' : '⚠️ Ошибка БД';
            } else {
                $r = db()->prepare('DELETE FROM reviews WHERE id = ?');
                $r->execute([$id]);
                $result = $r->rowCount() ? '🗑 Отклонено и удалено' : '⚠️ Ошибка БД';
            }
        }
        tg_api('answerCallbackQuery', ['callback_query_id' => $cq['id'], 'text' => $result]);
        if (!empty($cq['message'])) {
            tg_api('editMessageText', [
                'chat_id' => $cq['message']['chat']['id'],
                'message_id' => $cq['message']['message_id'],
                'text' => ($cq['message']['text'] ?? '') . "\n\n— " . $result,
                'reply_markup' => ['inline_keyboard' => []],
            ]);
        }
        json_response(['ok' => true]);
    }

    $msg = $update['message'] ?? null;
    if ($msg && isset($msg['text'])) {
        $text = trim((string)$msg['text']);
        $fromId = (string)($msg['from']['id'] ?? '');
        if (str_starts_with($text, '/start')) {
            tg_api('sendMessage', [
                'chat_id' => $msg['chat']['id'],
                'text' => "Бот Mirokon.\n\n• Новые отзывы приходят с кнопками «Одобрить» / «Отклонить».\n• Новые заявки приходят с кнопкой «✅ Обработана».\n• /leads — список необработанных заявок.",
            ]);
        } elseif ($text === '/leads' || str_starts_with($text, '/leads ') || $text === '/zayavki') {
            if ($fromId !== $adminChat) {
                tg_api('sendMessage', ['chat_id' => $msg['chat']['id'], 'text' => 'Команда доступна только администратору.']);
            } else {
                $rows = db()->query('SELECT * FROM leads WHERE processed = 0 ORDER BY created_at DESC LIMIT 15')->fetchAll();
                if (!$rows) {
                    tg_api('sendMessage', ['chat_id' => $msg['chat']['id'], 'text' => 'Нет необработанных заявок.']);
                } else {
                    foreach ($rows as $lead) {
                        $lead['cart_items'] = decode_json_col($lead['cart_items']);
                        $lead['processed'] = false;
                        tg_api('sendMessage', [
                            'chat_id' => $msg['chat']['id'],
                            'text' => lead_text($lead),
                            'reply_markup' => lead_keyboard($lead),
                            'disable_web_page_preview' => true,
                        ]);
                    }
                }
            }
        }
    }

    json_response(['ok' => true]);
} catch (Throwable $e) {
    error_log('tg.php: ' . $e->getMessage());
    json_response(['ok' => true]);
}
