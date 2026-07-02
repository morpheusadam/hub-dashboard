<?php
/**
 * Favicon proxy + cache. The server (fast, unfiltered) fetches the icon once,
 * stores it under data/icons, and serves it from our own origin thereafter — so
 * the client never makes slow third-party requests.
 */
declare(strict_types=1);
require __DIR__ . '/../lib.php';

if (!is_authed()) { http_response_code(403); exit; }

$d = strtolower((string)($_GET['d'] ?? ''));
$d = preg_replace('/[^a-z0-9.\-]/', '', $d);
if ($d === '' || strpos($d, '.') === false) { http_response_code(400); exit; }

$dir = __DIR__ . '/../data/icons';
if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
$file = $dir . '/' . md5($d) . '.img';

function fetch_bytes(string $url): string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 6,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (favicon-fetch)',
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if ($body === false || $code !== 200 || strlen((string)$body) < 70) return '';
    if (stripos($type, 'image') === false && stripos($type, 'octet') === false) return '';
    return (string)$body;
}

if (!is_file($file) || filesize($file) < 70) {
    $img = fetch_bytes('https://www.google.com/s2/favicons?domain=' . urlencode($d) . '&sz=64');
    if ($img === '') $img = fetch_bytes('https://icons.duckduckgo.com/ip3/' . urlencode($d) . '.ico');
    if ($img === '') $img = fetch_bytes('https://' . $d . '/favicon.ico');
    if ($img !== '') file_put_contents($file, $img, LOCK_EX);
}

header('Cache-Control: public, max-age=2592000, immutable');
header('X-Robots-Tag: noindex');
if (is_file($file) && filesize($file) >= 70) {
    header('Content-Type: image/png');
    readfile($file);
} else {
    // 1x1 transparent PNG fallback so the tile just shows its gradient.
    header('Content-Type: image/png');
    echo base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC');
}
