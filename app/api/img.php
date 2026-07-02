<?php
/** Image proxy + cache. Fetches remote images server-side (bypasses hotlink/mixed-content),
 * serves them from our own https origin. Auth-gated. Used for news og:images. */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
if (!is_authed()) { http_response_code(403); exit; }

$u = (string)($_GET['u'] ?? '');
if (!preg_match('#^https?://#i', $u) || strlen($u) > 2000) { http_response_code(400); exit; }

$dir = __DIR__ . '/../data/imgcache';
if (!is_dir($dir)) @mkdir($dir, 0777, true);
$key  = md5($u);
$file = "$dir/$key.img";
$meta = "$dir/$key.type";

if (!is_file($file) || filesize($file) < 100) {
    $host = parse_url($u, PHP_URL_HOST) ?: '';
    $ch = curl_init($u);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        CURLOPT_REFERER => 'https://' . $host . '/',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if ($body === false || $code !== 200 || strlen($body) < 100 || stripos($type, 'image') === false) { http_response_code(404); exit; }
    if (strlen($body) > 6 * 1024 * 1024) { http_response_code(413); exit; }
    file_put_contents($file, $body, LOCK_EX);
    file_put_contents($meta, preg_replace('/[^a-z0-9\/;=+.\- ]/i', '', $type) ?: 'image/jpeg');
}
$type = is_file($meta) ? trim((string)file_get_contents($meta)) : 'image/jpeg';
if ($type === '') $type = 'image/jpeg';
header('Content-Type: ' . $type);
header('Cache-Control: public, max-age=604800, immutable');
header('X-Robots-Tag: noindex');
readfile($file);
