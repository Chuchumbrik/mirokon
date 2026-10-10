<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
cors_and_methods(['POST', 'OPTIONS']);
require_method('POST');
auth_require();

$body = json_body();
$id = (string)($body['id'] ?? '');
$action = (string)($body['action'] ?? '');
$type = (string)($body['type'] ?? 'review');

$uuidRe = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
$actions = [
    'review' => ['approve', 'reject'],
    'lead' => ['process', 'unprocess', 'delete'],
];
if (!preg_match($uuidRe, $id) || !isset($actions[$type]) || !in_array($action, $actions[$type], true)) {
    json_response(['error' => 'bad request'], 400);
}

try {
    if ($type === 'review') {
        $s = db()->prepare('SELECT * FROM reviews WHERE id = ?');
        $s->execute([$id]);
        $review = $s->fetch();
        if (!$review) {
            json_response(['error' => 'not found'], 404);
        }
        if ($action === 'approve') {
            db()->prepare('UPDATE reviews SET approved = 1 WHERE id = ?')->execute([$id]);
            $note = '✅ Одобрено в админке';
        } else {
            db()->prepare('DELETE FROM reviews WHERE id = ?')->execute([$id]);
            $note = '🗑 Отклонено в админке';
        }
        if (tg_enabled() && !empty($review['tg_chat_id']) && !empty($review['tg_message_id'])) {
            $base = "🗣 Новый отзыв Mirokon на модерацию:\n\n👤 {$review['author_name']}"
                . ($review['author_city'] ? ' · ' . $review['author_city'] : '')
                . "\n⭐ {$review['rating']}/5\n💬 {$review['text']}";
            tg_api('editMessageText', [
                'chat_id' => $review['tg_chat_id'],
                'message_id' => (int)$review['tg_message_id'],
                'text' => $base . "\n\n— " . $note,
                'reply_markup' => ['inline_keyboard' => []],
                'disable_web_page_preview' => true,
            ]);
        }
        json_response(['success' => true]);
    }

    // lead
    $s = db()->prepare('SELECT * FROM leads WHERE id = ?');
    $s->execute([$id]);
    $lead = $s->fetch();
    if (!$lead) {
        json_response(['error' => 'not found'], 404);
    }
    $lead['cart_items'] = decode_json_col($lead['cart_items']);
    $lead['processed'] = (bool)$lead['processed'];

    if ($action === 'delete') {
        db()->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
        if (tg_enabled() && !empty($lead['tg_chat_id']) && !empty($lead['tg_message_id'])) {
            tg_api('editMessageText', [
                'chat_id' => $lead['tg_chat_id'],
                'message_id' => (int)$lead['tg_message_id'],
                'text' => lead_text($lead) . "\n\n— 🗑 Удалено в админке",
                'reply_markup' => ['inline_keyboard' => []],
                'disable_web_page_preview' => true,
            ]);
        }
        json_response(['success' => true]);
    }

    $processed = $action === 'process' ? 1 : 0;
    db()->prepare('UPDATE leads SET processed = ? WHERE id = ?')->execute([$processed, $id]);
    $lead['processed'] = (bool)$processed;
    if (tg_enabled() && !empty($lead['tg_chat_id']) && !empty($lead['tg_message_id'])) {
        tg_api('editMessageText', [
            'chat_id' => $lead['tg_chat_id'],
            'message_id' => (int)$lead['tg_message_id'],
            'text' => lead_text($lead),
            'reply_markup' => lead_keyboard($lead),
            'disable_web_page_preview' => true,
        ]);
    }
    json_response(['success' => true]);
} catch (Throwable $e) {
    error_log('moderate.php: ' . $e->getMessage());
    json_response(['error' => 'Не удалось выполнить действие'], 500);
}
