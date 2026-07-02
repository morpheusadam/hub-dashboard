<?php
/** Read/write user settings (data/settings.json) and change the login password.
 * Auth-gated; the GitHub token is never returned in plaintext. */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require __DIR__ . '/../lib_settings.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $s = get_settings();
    $s['_hasGithubToken'] = !empty($s['github']['token']);
    if (!empty($s['github']['token'])) {
        $s['github']['token'] = '';           // never expose the token
    }
    echo json_encode($s, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST' || $method === 'PUT') {
    assert_same_origin();
    $raw = file_get_contents('php://input') ?: '';
    $in  = json_decode($raw, true);
    if (!is_array($in)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid json']);
        exit;
    }

    // Optional password change: requires the current password.
    if (!empty($in['newPassword'])) {
        if (!password_verify((string) ($in['currentPassword'] ?? ''), cfg()['password_hash'])) {
            http_response_code(403);
            echo json_encode(['error' => 'current password incorrect']);
            exit;
        }
        if (strlen((string) $in['newPassword']) < 8) {
            http_response_code(400);
            echo json_encode(['error' => 'new password too short']);
            exit;
        }
        $c = cfg();
        $c['password_hash'] = password_hash((string) $in['newPassword'], PASSWORD_DEFAULT);
        $php = "<?php\nreturn " . var_export($c, true) . ";\n";
        if (@file_put_contents(__DIR__ . '/../config.php', $php, LOCK_EX) === false) {
            http_response_code(500);
            echo json_encode(['error' => 'could not update config.php']);
            exit;
        }
    }
    unset($in['newPassword'], $in['currentPassword'], $in['_hasGithubToken']);

    // Keep the existing token if the client sent back a blank/masked value.
    if (isset($in['github']['token']) && trim((string) $in['github']['token']) === '') {
        unset($in['github']['token']);
    }

    if ($in && !save_settings($in)) {
        http_response_code(500);
        echo json_encode(['error' => 'could not save settings']);
        exit;
    }
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
