<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
cors_and_methods(['POST', 'DELETE', 'OPTIONS']);
auth_require();

$root = dirname(__DIR__) . '/uploads';
$allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
$maxBytes = 15 * 1024 * 1024;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'DELETE') {
    $body = json_body();
    $paths = $body['paths'] ?? [];
    if (!is_array($paths)) {
        $paths = [];
    }
    foreach ($paths as $p) {
        $p = str_replace(['..', '\\'], '', (string)$p);
        $p = ltrim($p, '/');
        if ($p === '' || !str_starts_with($p, 'works/') && !str_starts_with($p, 'news/') && !str_starts_with($p, 'site/')) {
            // also accept bare filenames as works/
            if (!preg_match('#^[a-zA-Z0-9._-]+$#', $p)) {
                continue;
            }
            $full = $root . '/works/' . $p;
        } else {
            $full = $root . '/' . $p;
        }
        if (is_file($full)) {
            @unlink($full);
        }
    }
    json_response(['error' => null]);
}

require_method('POST');

if (empty($_FILES['file'])) {
    json_response(['error' => ['message' => 'no file']], 400);
}
$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    json_response(['error' => ['message' => 'upload error']], 400);
}
if (($file['size'] ?? 0) > $maxBytes) {
    json_response(['error' => ['message' => 'file too large']], 400);
}

$path = (string)($_POST['path'] ?? '');
$path = str_replace(['..', '\\'], '', $path);
$path = ltrim($path, '/');
if ($path === '') {
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
    if (!in_array($ext, $allowedExt, true)) {
        $ext = 'jpg';
    }
    $path = 'works/' . uuid_v4() . '.' . $ext;
}

// normalize folder
if (!str_contains($path, '/')) {
    $path = 'works/' . $path;
}
$folder = explode('/', $path)[0];
if (!in_array($folder, ['works', 'news', 'site'], true)) {
    json_response(['error' => ['message' => 'bad path']], 400);
}

$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true)) {
    json_response(['error' => ['message' => 'bad extension']], 400);
}

$dest = $root . '/' . $path;
@mkdir(dirname($dest), 0755, true);
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_response(['error' => ['message' => 'save failed']], 500);
}

$publicUrl = '/uploads/' . $path;
json_response([
    'data' => [
        'path' => $path,
        'publicUrl' => $publicUrl,
    ],
    'error' => null,
]);
