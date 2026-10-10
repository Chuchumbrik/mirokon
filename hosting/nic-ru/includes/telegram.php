<?php
declare(strict_types=1);

function tg_enabled(): bool
{
    global $CONFIG;
    return !empty($CONFIG['tg_bot_token']);
}

function tg_api(string $method, array $body): ?array
{
    global $CONFIG;
    $token = $CONFIG['tg_bot_token'] ?? '';
    if ($token === '') {
        return null;
    }
    $ch = curl_init('https://api.telegram.org/bot' . $token . '/' . $method);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    if ($raw === false) {
        return null;
    }
    $json = json_decode($raw, true);
    return is_array($json) ? $json : null;
}

function tg_chat_id(): string
{
    global $CONFIG;
    return (string)($CONFIG['tg_chat_id'] ?? '');
}
