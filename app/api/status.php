<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$statusFile = __DIR__ . '/../data/status.json';
$logFile    = __DIR__ . '/../data/backup-log.tail.txt';
$status = is_file($statusFile) ? json_decode((string) file_get_contents($statusFile), true) : null;
$log    = is_file($logFile) ? (string) file_get_contents($logFile) : '';
echo json_encode(['status' => $status, 'log' => $log], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
