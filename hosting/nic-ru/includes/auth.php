<?php
declare(strict_types=1);

function auth_start(): void
{
    global $CONFIG;
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $name = $CONFIG['session_name'] ?? 'mirokon_admin';
    session_name($name);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function auth_user(): ?array
{
    auth_start();
    if (empty($_SESSION['admin_id']) || empty($_SESSION['admin_email'])) {
        return null;
    }
    return [
        'id' => (string)$_SESSION['admin_id'],
        'email' => (string)$_SESSION['admin_email'],
    ];
}

function auth_require(): array
{
    $u = auth_user();
    if (!$u) {
        json_response(['error' => 'unauthorized'], 401);
    }
    return $u;
}

function auth_login(string $email, string $password): bool
{
    $email = mb_strtolower(trim($email));
    $stmt = db()->prepare('SELECT id, email, password_hash FROM admins WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        return false;
    }
    auth_start();
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $row['id'];
    $_SESSION['admin_email'] = $row['email'];
    return true;
}

function auth_logout(): void
{
    auth_start();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', (bool)$p['secure'], (bool)$p['httponly']);
    }
    session_destroy();
}
