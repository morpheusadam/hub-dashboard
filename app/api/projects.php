<?php
/** Projects snapshot — live Solova task counts + local git repo status.
 * The data is produced on the host by hub-refresh.py (cron) and written to
 * data/projects.json, because the hub PHP container cannot reach the Solova
 * database or the host git repos directly. This endpoint just serves it. */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$file = __DIR__ . '/../data/projects.json';
if (is_file($file)) {
    readfile($file);
} else {
    echo json_encode(['solova' => null, 'repos' => [], 'lavzenUpdated' => null, 'generated' => null]);
}
