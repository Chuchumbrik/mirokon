<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';
cors_and_methods(['GET', 'POST', 'OPTIONS']);
require_method('GET', 'POST');

$body = ($_SERVER['REQUEST_METHOD'] === 'GET')
    ? [
        'op' => $_GET['op'] ?? 'select',
        'table' => $_GET['table'] ?? '',
        'select' => $_GET['select'] ?? '*',
        'filters' => isset($_GET['filters']) ? json_decode((string)$_GET['filters'], true) : [],
        'order' => isset($_GET['order']) ? json_decode((string)$_GET['order'], true) : [],
        'limit' => isset($_GET['limit']) ? (int)$_GET['limit'] : null,
        'single' => !empty($_GET['single']),
        'maybeSingle' => !empty($_GET['maybeSingle']),
        'count' => !empty($_GET['count']),
        'head' => !empty($_GET['head']),
      ]
    : json_body();

$table = (string)($body['table'] ?? '');
$op = (string)($body['op'] ?? 'select');

$PUBLIC_READ = [
    'works' => ['mode' => 'published'],
    'reviews' => ['mode' => 'approved'],
    'news' => ['mode' => 'published'],
    'categories' => ['mode' => 'all'],
    'site_settings' => ['mode' => 'all'],
    'work_photos' => ['mode' => 'published_work'],
];
$ADMIN_TABLES = [
    'works', 'reviews', 'news', 'categories', 'site_settings',
    'work_photos', 'leads', 'admins',
];

$admin = auth_user();
$isAdmin = (bool)$admin;

if (!in_array($table, $ADMIN_TABLES, true) && !isset($PUBLIC_READ[$table])) {
    json_response(['error' => 'unknown table'], 400);
}

$writeOps = ['insert', 'update', 'delete', 'upsert'];
if (in_array($op, $writeOps, true) || $table === 'leads' || $table === 'admins') {
    if (!$isAdmin) {
        json_response(['error' => 'unauthorized'], 401);
    }
}

try {
    switch ($op) {
        case 'select':
        case 'count':
            json_response(handle_select($body, $isAdmin, $PUBLIC_READ));
        case 'insert':
            json_response(handle_insert($body));
        case 'update':
            json_response(handle_update($body));
        case 'delete':
            json_response(handle_delete($body));
        case 'upsert':
            json_response(handle_upsert($body));
        default:
            json_response(['error' => 'bad op'], 400);
    }
} catch (Throwable $e) {
    error_log('db.php: ' . $e->getMessage());
    json_response(['error' => 'db error', 'message' => $e->getMessage()], 500);
}

function table_columns(string $table): array
{
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }
    $stmt = db()->query('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '`');
    $cols = [];
    foreach ($stmt->fetchAll() as $row) {
        $cols[$row['Field']] = $row;
    }
    $cache[$table] = $cols;
    return $cols;
}

function map_row(string $table, array $row): array
{
    $jsonCols = [
        'works' => ['scope'],
        'leads' => ['cart_items'],
        'site_settings' => ['data'],
    ];
    $boolCols = [
        'works' => ['published'],
        'reviews' => ['approved'],
        'news' => ['published'],
        'leads' => ['processed'],
    ];
    // API alias: frontend uses "system", DB column is system_name
    if ($table === 'works' && array_key_exists('system_name', $row)) {
        $row['system'] = $row['system_name'];
    }
    foreach ($jsonCols[$table] ?? [] as $c) {
        if (array_key_exists($c, $row)) {
            $row[$c] = decode_json_col($row[$c]);
        }
    }
    foreach ($boolCols[$table] ?? [] as $c) {
        if (array_key_exists($c, $row)) {
            $row[$c] = (bool)$row[$c];
        }
    }
    return $row;
}

function prepare_write(string $table, array $data, bool $isInsert): array
{
    $cols = table_columns($table);
    $out = [];
    if ($table === 'works' && array_key_exists('system', $data)) {
        $data['system_name'] = $data['system'];
        unset($data['system']);
    }
    foreach ($data as $k => $v) {
        if ($k === 'work_photos' || $k === 'id' && !$isInsert && $table !== 'site_settings') {
            // id handled separately for updates; nested relations ignored
        }
        if (!isset($cols[$k])) {
            continue;
        }
        if (in_array($k, ['scope', 'cart_items', 'data'], true)) {
            $out[$k] = encode_json_col($v);
        } elseif (in_array($k, ['published', 'approved', 'processed'], true)) {
            $out[$k] = bool01($v);
        } else {
            $out[$k] = $v;
        }
    }
    if ($isInsert && isset($cols['id']) && empty($out['id'])) {
        $out['id'] = uuid_v4();
    }
    return $out;
}

function handle_select(array $body, bool $isAdmin, array $PUBLIC_READ): array
{
    $table = (string)$body['table'];
    $filters = is_array($body['filters'] ?? null) ? $body['filters'] : [];
    $order = is_array($body['order'] ?? null) ? $body['order'] : [];
    $limit = isset($body['limit']) ? (int)$body['limit'] : null;
    $wantCount = !empty($body['count']) || ($body['op'] ?? '') === 'count';
    $head = !empty($body['head']);
    $single = !empty($body['single']);
    $maybeSingle = !empty($body['maybeSingle']);

    $where = [];
    $params = [];

    if (!$isAdmin) {
        $mode = $PUBLIC_READ[$table]['mode'] ?? null;
        if ($mode === 'published') {
            $where[] = 'published = 1';
        } elseif ($mode === 'approved') {
            $where[] = 'approved = 1';
        } elseif ($mode === 'published_work') {
            $where[] = 'EXISTS (SELECT 1 FROM works w WHERE w.id = work_photos.work_id AND w.published = 1)';
        } elseif ($mode === null) {
            json_response(['error' => 'forbidden'], 403);
        }
    }

    $cols = table_columns($table);
    foreach ($filters as $f) {
        if (!is_array($f) || count($f) < 2) {
            continue;
        }
        $op = $f[0];
        $col = $f[1];
        if (!isset($cols[$col]) && !($table === 'works' && $col === 'system')) {
            continue;
        }
        if ($table === 'works' && $col === 'system') {
            $col = 'system_name';
        }
        if ($op === 'eq') {
            $where[] = "`$col` = ?";
            $params[] = $f[2] ?? null;
        } elseif ($op === 'in' && is_array($f[2] ?? null) && count($f[2])) {
            $ph = implode(',', array_fill(0, count($f[2]), '?'));
            $where[] = "`$col` IN ($ph)";
            foreach ($f[2] as $v) {
                $params[] = $v;
            }
        } elseif ($op === 'neq') {
            $where[] = "`$col` <> ?";
            $params[] = $f[2] ?? null;
        }
    }

    $sqlWhere = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

    if ($wantCount) {
        $stmt = db()->prepare("SELECT COUNT(*) FROM `$table`" . $sqlWhere);
        $stmt->execute($params);
        $count = (int)$stmt->fetchColumn();
        if ($head) {
            header('Content-Range: */' . $count);
        }
        return ['data' => null, 'count' => $count, 'error' => null];
    }

    $select = '*';
    // Nested work_photos(id) from admin — load separately if requested
    $embedPhotos = false;
    $selRaw = (string)($body['select'] ?? '*');
    if (str_contains($selRaw, 'work_photos')) {
        $embedPhotos = true;
    }

    $sql = "SELECT $select FROM `$table`" . $sqlWhere;
    $orderSql = [];
    foreach ($order as $o) {
        if (!is_array($o) || !isset($o[0])) {
            continue;
        }
        $col = $o[0] === 'system' ? 'system_name' : $o[0];
        if (!isset($cols[$col])) {
            continue;
        }
        $dir = strtolower((string)($o[1] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';
        $orderSql[] = "`$col` $dir";
    }
    if ($orderSql) {
        $sql .= ' ORDER BY ' . implode(', ', $orderSql);
    }
    if ($limit !== null && $limit > 0) {
        $sql .= ' LIMIT ' . (int)$limit;
    }

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = array_map(fn($r) => map_row($table, $r), $stmt->fetchAll());

    if ($embedPhotos && $table === 'works' && $rows) {
        $ids = array_column($rows, 'id');
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $ps = db()->prepare("SELECT id, work_id FROM work_photos WHERE work_id IN ($ph)");
        $ps->execute($ids);
        $by = [];
        foreach ($ps->fetchAll() as $p) {
            $by[$p['work_id']][] = ['id' => $p['id']];
        }
        foreach ($rows as &$r) {
            $r['work_photos'] = $by[$r['id']] ?? [];
        }
        unset($r);
    }

    if ($single || $maybeSingle) {
        if (!$rows) {
            if ($single) {
                return ['data' => null, 'error' => ['message' => 'not found']];
            }
            return ['data' => null, 'error' => null];
        }
        return ['data' => $rows[0], 'error' => null];
    }
    return ['data' => $rows, 'error' => null];
}

function handle_insert(array $body): array
{
    $table = (string)$body['table'];
    $data = is_array($body['data'] ?? null) ? $body['data'] : [];
    $row = prepare_write($table, $data, true);
    if (!$row) {
        return ['data' => null, 'error' => ['message' => 'empty']];
    }
    $cols = array_keys($row);
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $sql = 'INSERT INTO `' . $table . '` (`' . implode('`,`', $cols) . '`) VALUES (' . $ph . ')';
    db()->prepare($sql)->execute(array_values($row));
    $wantSingle = !empty($body['single']) || !empty($body['return']);
    if ($wantSingle || !empty($body['select'])) {
        $id = $row['id'] ?? null;
        if ($id) {
            $s = db()->prepare("SELECT * FROM `$table` WHERE id = ?");
            $s->execute([$id]);
            $fetched = $s->fetch();
            return ['data' => $fetched ? map_row($table, $fetched) : map_row($table, $row), 'error' => null];
        }
    }
    return ['data' => map_row($table, $row), 'error' => null];
}

function handle_update(array $body): array
{
    $table = (string)$body['table'];
    $data = is_array($body['data'] ?? null) ? $body['data'] : [];
    $filters = is_array($body['filters'] ?? null) ? $body['filters'] : [];
    $row = prepare_write($table, $data, false);
    if (!$row) {
        return ['data' => null, 'error' => ['message' => 'empty']];
    }
    $sets = [];
    $params = [];
    foreach ($row as $k => $v) {
        $sets[] = "`$k` = ?";
        $params[] = $v;
    }
    $where = [];
    $cols = table_columns($table);
    foreach ($filters as $f) {
        if (($f[0] ?? '') === 'eq' && isset($cols[$f[1]])) {
            $where[] = '`' . $f[1] . '` = ?';
            $params[] = $f[2] ?? null;
        }
    }
    if (!$where) {
        return ['data' => null, 'error' => ['message' => 'missing filter']];
    }
    $sql = 'UPDATE `' . $table . '` SET ' . implode(', ', $sets) . ' WHERE ' . implode(' AND ', $where);
    db()->prepare($sql)->execute($params);
    return ['data' => null, 'error' => null];
}

function handle_delete(array $body): array
{
    $table = (string)$body['table'];
    $filters = is_array($body['filters'] ?? null) ? $body['filters'] : [];
    $where = [];
    $params = [];
    $cols = table_columns($table);
    foreach ($filters as $f) {
        if (($f[0] ?? '') === 'eq' && isset($cols[$f[1]])) {
            $where[] = '`' . $f[1] . '` = ?';
            $params[] = $f[2] ?? null;
        }
    }
    if (!$where) {
        return ['data' => null, 'error' => ['message' => 'missing filter']];
    }
    $sql = 'DELETE FROM `' . $table . '` WHERE ' . implode(' AND ', $where);
    db()->prepare($sql)->execute($params);
    return ['data' => null, 'error' => null];
}

function handle_upsert(array $body): array
{
    $table = (string)$body['table'];
    $data = is_array($body['data'] ?? null) ? $body['data'] : [];
    if ($table === 'site_settings') {
        $data['id'] = 1;
        $row = prepare_write($table, $data, true);
        $row['id'] = 1;
        $sql = 'INSERT INTO site_settings (id, data, updated_at) VALUES (1, ?, NOW())
                ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()';
        db()->prepare($sql)->execute([$row['data'] ?? '{}']);
        return ['data' => null, 'error' => null];
    }
    return handle_insert($body);
}
