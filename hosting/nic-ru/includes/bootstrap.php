<?php
declare(strict_types=1);

header_remove('X-Powered-By');

$root = dirname(__DIR__);
$configFile = $root . '/config.local.php';
if (!is_file($configFile)) {
    $configFile = $root . '/config.example.php';
}
/** @var array $CONFIG */
$CONFIG = require $configFile;

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/ratelimit.php';
require_once __DIR__ . '/telegram.php';
require_once __DIR__ . '/leads_render.php';
