<?php
/**
 * Одноразовый установщик: создаёт таблицы и тестовые данные.
 * После успешной установки УДАЛИТЕ этот файл с хостинга.
 *
 * Откройте в браузере: https://ваш-домен.ru/install.php
 * или CLI: php install.php
 */
declare(strict_types=1);

$cli = (PHP_SAPI === 'cli');
$root = __DIR__;

function out(string $msg, bool $cli): void
{
    if ($cli) {
        echo $msg . PHP_EOL;
    } else {
        echo htmlspecialchars($msg, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "<br>\n";
    }
}

if (!$cli) {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Mirokon install</title>';
    echo '<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.5}</style></head><body>';
    echo '<h1>Установка Mirokon (nic.ru)</h1>';
}

$configLocal = $root . '/config.local.php';
if (!is_file($configLocal)) {
    out('Создайте config.local.php на основе config.example.php и укажите доступ к MySQL.', $cli);
    if (!$cli) {
        echo '</body></html>';
    }
    exit(1);
}

/** @var array $CONFIG */
$CONFIG = require $configLocal;
require_once $root . '/includes/helpers.php';
require_once $root . '/includes/db.php';

try {
    $pdo = db();
    out('✓ Подключение к MySQL OK', $cli);

    $schema = file_get_contents($root . '/sql/schema.sql');
    $seed = file_get_contents($root . '/sql/seed.sql');
    if ($schema === false || $seed === false) {
        throw new RuntimeException('Не найдены sql/schema.sql или sql/seed.sql');
    }

    $pdo->exec($schema);
    out('✓ Схема применена', $cli);

    // seed может содержать несколько statements — выполняем по одному
    foreach (preg_split('/;\s*\n/', $seed) as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) {
            continue;
        }
        // skip pure comment blocks
        $stripped = trim(preg_replace('/^--.*$/m', '', $stmt) ?? '');
        if ($stripped === '') {
            continue;
        }
        $pdo->exec($stmt);
    }
    out('✓ Тестовые данные загружены', $cli);

    $hash = password_hash('MirokonTest!2026', PASSWORD_DEFAULT);
    $upd = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE email = ?');
    $upd->execute([$hash, 'test-admin@mirokon-new.test']);
    if ($upd->rowCount() < 1) {
        $pdo->prepare('INSERT INTO admins (id, email, password_hash) VALUES (?, ?, ?)')
            ->execute(['a0000000-0000-4000-8000-000000000001', 'test-admin@mirokon-new.test', $hash]);
    }
    out('✓ Админ: test-admin@mirokon-new.test / MirokonTest!2026', $cli);

    out('', $cli);
    out('Готово. Удалите install.php с сервера.', $cli);
    out('Вход в админку: /landing.html', $cli);
} catch (Throwable $e) {
    out('Ошибка: ' . $e->getMessage(), $cli);
    if (!$cli) {
        echo '</body></html>';
    }
    exit(1);
}

if (!$cli) {
    echo '<p><strong>Удалите install.php</strong> и откройте <a href="/">сайт</a> / <a href="/landing.html">админку</a>.</p></body></html>';
}
