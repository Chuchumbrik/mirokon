<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
cors_and_methods(['POST', 'OPTIONS']);
require_method('POST');

function lead_phone_ok(string $phone): bool
{
    $d = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($d) === 11 && $d[0] === '8') {
        $d = '7' . substr($d, 1);
    } elseif (strlen($d) === 10 && $d[0] === '9') {
        $d = '7' . $d;
    }
    return (bool)preg_match('/^7\d{10}$/', $d);
}

$body = json_body();
if (trim((string)($body['hp'] ?? '')) !== '') {
    json_response(['success' => true, 'message' => 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.']);
}
$name = mb_substr(trim((string)($body['name'] ?? '')), 0, 80);
$phone = mb_substr(trim((string)($body['phone'] ?? '')), 0, 32);
$message = mb_substr(trim((string)($body['message'] ?? '')), 0, 2000);
$cart = $body['cart_items'] ?? null;
if (is_array($cart)) {
    $cart = array_slice($cart, 0, 50);
} else {
    $cart = null;
}

if (empty($body['consent'])) {
    json_response(['error' => 'Нужно согласие на обработку персональных данных'], 400);
}
if ($name === '' || !lead_phone_ok($phone)) {
    json_response(['error' => 'Укажите имя и телефон в формате +7'], 400);
}

$ip = client_ip();
if (!check_rate_limit('lead', $ip, 5, 3600)) {
    json_response(['error' => 'Слишком много заявок. Попробуйте позже или позвоните нам напрямую.'], 429);
}

try {
    $id = uuid_v4();
    $stmt = db()->prepare(
        'INSERT INTO leads (id, name, phone, message, cart_items, processed) VALUES (?, ?, ?, ?, ?, 0)'
    );
    $stmt->execute([$id, $name, $phone, $message !== '' ? $message : null, encode_json_col($cart)]);

    $lead = [
        'id' => $id,
        'name' => $name,
        'phone' => $phone,
        'message' => $message !== '' ? $message : null,
        'cart_items' => $cart,
        'processed' => false,
        'created_at' => date('Y-m-d H:i:s'),
    ];

    if (tg_enabled() && tg_chat_id() !== '') {
        $tg = tg_api('sendMessage', [
            'chat_id' => tg_chat_id(),
            'text' => lead_text($lead),
            'reply_markup' => lead_keyboard($lead),
            'disable_web_page_preview' => true,
        ]);
        if ($tg && !empty($tg['ok'])) {
            $mid = $tg['result']['message_id'] ?? null;
            $cid = $tg['result']['chat']['id'] ?? null;
            if ($mid) {
                db()->prepare('UPDATE leads SET tg_chat_id = ?, tg_message_id = ? WHERE id = ?')
                    ->execute([(string)$cid, (int)$mid, $id]);
            }
        }
    } elseif (tg_enabled() && tg_chat_id() === '') {
        // токен есть, чат не задан — всё равно сохранили в БД
    }

    global $CONFIG;
    $to = $CONFIG['lead_email_to'] ?? '';
    $from = $CONFIG['lead_email_from'] ?? '';
    if ($to && $from) {
        $cartText = '';
        if ($cart) {
            $total = 0;
            $cartText = "\n\nСостав заказа:\n";
            foreach ($cart as $i => $item) {
                $total += (int)($item['price'] ?? 0);
                $cartText .= ($i + 1) . '. ' . ($item['type'] ?? 'Окно') . ' — '
                    . ($item['width'] ?? '?') . '×' . ($item['height'] ?? '?') . " мм\n";
            }
            $cartText .= 'Итого: ~' . number_format($total, 0, '', ' ') . ' ₽';
        }
        $subject = 'Новая заявка Mirokon: ' . $name;
        $text = "Имя: $name\nТелефон: $phone\n"
            . ($message ? "Сообщение: $message\n" : '')
            . $cartText . "\n\nАдминка: " . admin_login_url();
        @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, "From: $from\r\nContent-Type: text/plain; charset=UTF-8");
    }

    json_response(['success' => true, 'message' => 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.']);
} catch (Throwable $e) {
    error_log('lead.php: ' . $e->getMessage());
    json_response(['error' => 'Не удалось отправить заявку. Попробуйте позвонить.'], 500);
}
