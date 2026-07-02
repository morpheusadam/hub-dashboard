<?php
/**
 * System page API: service/domain health checks, plus an optional Windows + WSL
 * autostart toggle. The autostart feature is only active when /winstartup is
 * bind-mounted into the container (Windows hosts); it is ignored everywhere else.
 *
 *  GET  ?action=status          -> { autostart, mountOk, domains:[{sub,host,code,up}] }
 *  POST {action:enable|disable} -> toggle the Windows Startup entry
 */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require __DIR__ . '/../lib_settings.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
require_auth_json();

const STARTUP_FILE = '/winstartup/KeepWSLUp.vbs';

const VBS_CONTENT = <<<VBS
' Launches WSL (Ubuntu) hidden and holds it open so the self-hosted Docker
' services stay reachable after a reboot. Managed by the hub System page.
Set sh = CreateObject("WScript.Shell")
sh.Run "wsl.exe -d Ubuntu -u root -e sh -c ""while true; do sleep 3600; done""", 0, False
VBS;

function autostart_on(): bool { return is_file(STARTUP_FILE); }
function mount_ok(): bool { return is_dir('/winstartup'); }

/** Health-check one host. $sub is the label; with $base it forms "$sub.$base". */
function check_domain(string $sub, string $base): array {
    $host = $base !== '' ? "$sub.$base" : $sub;
    $ch = curl_init("https://$host/");
    curl_setopt_array($ch, [
        CURLOPT_NOBODY         => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT      => 'hub-dashboard-healthcheck',
    ]);
    curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    // Any real HTTP response (2xx/3xx/401/403) means the service answered.
    $up = $code > 0 && $code < 500;
    return ['sub' => $sub, 'host' => $host, 'code' => $code, 'up' => $up];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    assert_same_origin();
    $raw = file_get_contents('php://input') ?: '';
    $in  = json_decode($raw, true);
    $action = is_array($in) ? ($in['action'] ?? '') : ($_POST['action'] ?? '');

    if (!mount_ok()) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'autostart is only available on Windows + WSL (/winstartup not mounted)']);
        exit;
    }

    if ($action === 'enable') {
        $bytes = @file_put_contents(STARTUP_FILE, VBS_CONTENT);
        if ($bytes === false) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'write failed']); exit; }
        echo json_encode(['ok' => true, 'autostart' => autostart_on()]);
        exit;
    }
    if ($action === 'disable') {
        if (is_file(STARTUP_FILE) && !@unlink(STARTUP_FILE)) {
            http_response_code(500); echo json_encode(['ok'=>false,'error'=>'delete failed']); exit;
        }
        echo json_encode(['ok' => true, 'autostart' => autostart_on()]);
        exit;
    }
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad action']);
    exit;
}

// GET -> status
$action = $_GET['action'] ?? 'status';
if ($action !== 'status') { http_response_code(400); echo json_encode(['error'=>'bad action']); exit; }

$svc  = get_settings()['services'] ?? [];
$base = trim((string) ($svc['baseDomain'] ?? ''));
$subs = is_array($svc['domains'] ?? null) ? $svc['domains'] : [];

$domains = [];
foreach ($subs as $sub) { $domains[] = check_domain((string) $sub, $base); }

echo json_encode([
    'autostart' => autostart_on(),
    'mountOk'   => mount_ok(),
    'domains'   => $domains,
    'ts'        => time(),
]);
