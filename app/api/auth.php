<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    echo json_encode(['authed' => is_authed()]);
    exit;
}
if ($method === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $in  = json_decode($raw, true) ?: [];
    if (($in['action'] ?? '') === 'logout') {
        clear_cookie();
        echo json_encode(['ok' => true, 'authed' => false]);
        exit;
    }
    assert_same_origin();
    usleep(250000); // blunt brute force
    $pw = (string) ($in['password'] ?? '');
    if (password_verify($pw, cfg()['password_hash'])) {
        issue_cookie(!empty($in['remember']));
        echo json_encode(['ok' => true, 'authed' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'bad password']);
    }
    exit;
}
http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
