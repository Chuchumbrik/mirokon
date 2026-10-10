<?php
/**
 * Скопируйте в config.local.php и заполните данные MySQL из панели nic.ru.
 * config.local.php не коммитится в git.
 */
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'mirokon',
        'user' => 'mirokon',
        'pass' => 'CHANGE_ME',
        'charset' => 'utf8mb4',
    ],

    // Публичный URL сайта без слэша в конце (для Telegram-кнопок и sitemap)
    'site_url' => 'https://example.ru',

    // Telegram (опционально — без токена заявки всё равно пишутся в БД)
    'tg_bot_token' => '',
    'tg_chat_id' => '',
    'tg_webhook_secret' => '',

    // E-mail дубль заявки (опционально, через PHP mail())
    'lead_email_to' => '',
    'lead_email_from' => '',

    // Сессия админки
    'session_name' => 'mirokon_admin',

    // Первый админ. install.php запишет его в таблицу admins и больше пароль нигде не хранит.
    'admin_email' => 'admin@example.ru',
    'admin_password' => 'CHANGE_ME',
];
