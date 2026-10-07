<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
cors_and_methods(['GET', 'POST', 'OPTIONS']);

$body = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' ? json_body() : [];
$action = (string)($_GET['action'] ?? ($body['action'] ?? ''));
if ($action === '' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $action = 'session';
}

if ($action === 'session') {
    require_method('GET', 'POST');
    $u = auth_user();
    if (!$u) {
        json_response(['data' => ['session' => null], 'error' => null]);
    }
    json_response([
        'data' => [
            'session' => [
                'access_token' => 'session',
                'user' => ['id' => $u['id'], 'email' => $u['email']],
            ],
        ],
        'error' => null,
    ]);
}

if ($action === 'login') {
    require_method('POST');
    $email = trim((string)($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');
    if ($email === '' || $password === '') {
        json_response(['error' => ['message' => 'missing credentials']], 400);
    }
    if (!auth_login($email, $password)) {
        json_response(['error' => ['message' => 'Invalid login']], 401);
    }
    $u = auth_user();
    json_response([
        'data' => [
            'session' => [
                'access_token' => 'session',
                'user' => ['id' => $u['id'], 'email' => $u['email']],
            ],
        ],
        'error' => null,
    ]);
}

if ($action === 'logout') {
    require_method('POST', 'GET');
    auth_logout();
    json_response(['error' => null]);
}

if ($action === 'is_admin') {
    require_method('GET', 'POST');
    json_response(['data' => auth_user() !== null, 'error' => null]);
}

json_response(['error' => 'unknown action'], 400);
