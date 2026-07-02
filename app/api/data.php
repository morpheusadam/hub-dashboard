<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_auth_json();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$file = __DIR__ . '/../data/hub.json';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (is_file($file)) {
        readfile($file);
    } else {
        echo json_encode(['lists' => [], 'timers' => [], 'settings' => new stdClass()]);
    }
    exit;
}

if ($method === 'POST' || $method === 'PUT') {
    assert_same_origin();
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 4 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'payload too large']);
        exit;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid json']);
        exit;
    }
    // Normalise top-level shape so the file is always well-formed.
    $clean = [
        'lists'    => $data['lists']    ?? [],
        'timers'   => $data['timers']   ?? [],
        'settings' => $data['settings'] ?? new stdClass(),
    ];
    $json = json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Atomic write: tmp file + rename.
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $file)) {
        @unlink($tmp);
        http_response_code(500);
        echo json_encode(['error' => 'write failed']);
        exit;
    }
    echo json_encode(['ok' => true, 'savedAt' => time()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
