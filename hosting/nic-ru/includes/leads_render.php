<?php
declare(strict_types=1);

function lead_text(array $lead): string
{
    $status = !empty($lead['processed']) ? '✅ Обработана' : '🟡 Новая';
    $idShort = substr((string)$lead['id'], 0, 8);
    $text = "🪟 Заявка #{$idShort} · {$status}\n\n"
        . "👤 Имя: {$lead['name']}\n"
        . "📞 Телефон: {$lead['phone']}\n";
    if (!empty($lead['message'])) {
        $text .= "💬 {$lead['message']}\n";
    }
    $cart = $lead['cart_items'] ?? null;
    if (is_string($cart)) {
        $cart = decode_json_col($cart);
    }
    if (is_array($cart) && count($cart)) {
        $total = 0;
        $text .= "\n📋 Заказ (" . count($cart) . " поз.):\n";
        foreach ($cart as $i => $item) {
            $price = (int)($item['price'] ?? 0);
            $total += $price;
            $type = $item['type'] ?? 'Окно';
            $w = $item['width'] ?? '?';
            $h = $item['height'] ?? '?';
            $text .= ($i + 1) . ". {$type} — {$w}×{$h} мм — ~" . number_format($price, 0, '', ' ') . " ₽\n";
            $specs = array_filter([$item['profile'] ?? null, $item['glass'] ?? null, $item['hardware'] ?? null]);
            if ($specs) {
                $text .= '   🔧 ' . implode(' · ', $specs) . "\n";
            }
        }
        $text .= '💰 Итого: ~' . number_format($total, 0, '', ' ') . " ₽\n";
    }
    if (!empty($lead['created_at'])) {
        $text .= "\n🕒 " . $lead['created_at'];
    }
    return $text;
}

function lead_keyboard(array $lead): array
{
    $processed = !empty($lead['processed']);
    $statusBtn = $processed
        ? ['text' => '↩️ Вернуть в работу', 'callback_data' => 'lundo:' . $lead['id']]
        : ['text' => '✅ Обработана', 'callback_data' => 'ldone:' . $lead['id']];
    return [
        'inline_keyboard' => [
            [$statusBtn],
            [['text' => '🔧 Открыть админку', 'url' => admin_login_url()]],
        ],
    ];
}
