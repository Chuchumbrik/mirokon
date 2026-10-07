<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
cors_and_methods(['POST', 'OPTIONS']);
require_method('POST');

$body = json_body();
$name = mb_substr(trim((string)($body['name'] ?? '')), 0, 80);
$text = mb_substr(trim((string)($body['text'] ?? '')), 0, 2000);
$city = mb_substr(trim((string)($body['city'] ?? '')), 0, 80);
$rating = (int)($body['rating'] ?? 0);

if ($name === '' || $text === '' || $rating < 1 || $rating > 5) {
    json_response(['error' => 'Заполните имя, текст и рейтинг (1–5)'], 400);
}

$ip = client_ip();
if (!check_rate_limit('review', $ip, 3, 3600)) {
    json_response(['error' => 'Слишком много отзывов. Попробуйте позже.'], 429);
}

try {
    $id = uuid_v4();
    db()->prepare(
        'INSERT INTO reviews (id, author_name, author_city, rating, text, approved) VALUES (?, ?, ?, ?, ?, 0)'
    )->execute([$id, $name, $city !== '' ? $city : null, $rating, $text]);

    if (tg_enabled() && tg_chat_id() !== '') {
        $keyboard = [
            'inline_keyboard' => [[
                ['text' => '✅ Одобрить', 'callback_data' => 'appr:' . $id],
                ['text' => '🗑 Отклонить', 'callback_data' => 'rej:' . $id],
            ], [
                ['text' => '🔧 Открыть админку', 'url' => admin_login_url()],
            ]],
        ];
        $tg = tg_api('sendMessage', [
            'chat_id' => tg_chat_id(),
            'text' => "🗣 Новый отзыв Mirokon на модерацию:\n\n👤 {$name}"
                . ($city !== '' ? ' · ' . $city : '') . "\n⭐ {$rating}/5\n💬 {$text}",
            'reply_markup' => $keyboard,
            'disable_web_page_preview' => true,
        ]);
        if ($tg && !empty($tg['ok'])) {
            $mid = $tg['result']['message_id'] ?? null;
            $cid = $tg['result']['chat']['id'] ?? null;
            if ($mid) {
                db()->prepare('UPDATE reviews SET tg_chat_id = ?, tg_message_id = ? WHERE id = ?')
                    ->execute([(string)$cid, (int)$mid, $id]);
            }
        }
    }

    json_response(['success' => true, 'message' => 'Спасибо! Отзыв отправлен на модерацию.']);
} catch (Throwable $e) {
    error_log('review.php: ' . $e->getMessage());
    json_response(['error' => 'Не удалось сохранить отзыв. Попробуйте позже.'], 500);
}
