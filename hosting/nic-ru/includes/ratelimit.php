<?php
declare(strict_types=1);

function check_rate_limit(string $endpoint, string $ip, int $max, int $windowSeconds): bool
{
    try {
        $pdo = db();
        $pdo->prepare('DELETE FROM rate_limits WHERE created_at < (NOW() - INTERVAL 2 DAY)')->execute();
        $ins = $pdo->prepare('INSERT INTO rate_limits (ip, endpoint) VALUES (?, ?)');
        $ins->execute([$ip, $endpoint]);
        $q = $pdo->prepare(
            'SELECT COUNT(*) FROM rate_limits WHERE endpoint = ? AND ip = ? AND created_at >= (NOW() - INTERVAL ? SECOND)'
        );
        $q->execute([$endpoint, $ip, $windowSeconds]);
        $count = (int)$q->fetchColumn();
        return $count <= $max;
    } catch (Throwable $e) {
        // fail-open как в исходном Node-коде
        error_log('rate_limit: ' . $e->getMessage());
        return true;
    }
}
