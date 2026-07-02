<?php
/** Trending post from a public Telegram channel (Persian tweets mirror).
 * Parses the public web preview (t.me/s/<channel>). Every page refresh returns a
 * DIFFERENT one of the most-viewed recent posts (round-robin), so the widget keeps
 * rotating through trending tweets. Auth-gated. Parsed pool cached ~10 min. */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require __DIR__ . '/../lib_settings.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$CHANNEL  = trim((string) (get_settings()['tweets']['telegramChannel'] ?? ''));
if ($CHANNEL === '') { echo json_encode(['error' => 'not configured']); exit; }
$dataDir  = __DIR__ . '/../data';
$poolFile = "$dataDir/tweet-pool.json";
$rotFile  = "$dataDir/tweet-rot.txt";
$TOP_N    = 8;    // rotate among this many most-viewed posts
$POOL_TTL = 600;  // refresh the parsed pool at most every 10 min

function views_num(string $s): int {
    $s = trim($s); $mult = 1;
    if (stripos($s, 'K') !== false) $mult = 1000;
    elseif (stripos($s, 'M') !== false) $mult = 1000000;
    $n = (float)preg_replace('/[^0-9.]/', '', $s);
    return (int)round($n * $mult);
}

/** Fetch + parse the public channel preview into an array of message dicts. */
function parse_channel(string $channel): array {
    $ch = curl_init("https://t.me/s/$channel");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 12,
      CURLOPT_USERAGENT => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36']);
    $html = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($html === false || $code !== 200) return [];

    preg_match_all('/data-post="' . preg_quote($channel, '/') . '\/(\d+)"/', $html, $mm, PREG_OFFSET_CAPTURE);
    $msgs = [];
    $n = count($mm[0]);
    for ($i = 0; $i < $n; $i++) {
        $id = $mm[1][$i][0];
        $start = $mm[0][$i][1];
        $end = ($i + 1 < $n) ? $mm[0][$i + 1][1] : strlen($html);
        $chunk = substr($html, $start, $end - $start);

        $views = 0;
        if (preg_match('/tgme_widget_message_views">([^<]+)</', $chunk, $m)) $views = views_num($m[1]);
        $date = null;
        if (preg_match('/<time[^>]+datetime="([^"]+)"/', $chunk, $m)) $date = $m[1];
        $img = null;
        if (preg_match('/tgme_widget_message_photo_wrap[^"]*"[^>]*background-image:url\([\'"]?([^\'")]+)/', $chunk, $m)) $img = html_entity_decode($m[1]);
        $text = '';
        if (preg_match('/tgme_widget_message_text[^>]*>(.*?)<\/div>/s', $chunk, $m)) {
            $t = preg_replace('/<br\s*\/?>/i', "\n", $m[1]);
            $t = strip_tags($t);
            $text = trim(html_entity_decode($t, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
        if ($text === '' && !$img) continue;
        $msgs[] = ['id' => $id, 'views' => $views, 'date' => $date, 'image' => $img, 'text' => $text];
    }
    return $msgs;
}

// --- load the parsed pool from cache, or refresh it from Telegram ---
$msgs = [];
if (is_file($poolFile) && (time() - filemtime($poolFile) < $POOL_TTL)) {
    $msgs = json_decode((string) file_get_contents($poolFile), true) ?: [];
}
if (!$msgs) {
    $msgs = parse_channel($CHANNEL);
    if ($msgs) @file_put_contents($poolFile, json_encode($msgs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
}
if (!$msgs) { http_response_code(502); echo json_encode(['error' => 'fetch failed']); exit; }

// --- rank by views (popularity), keep the top N, rotate through them per refresh ---
usort($msgs, fn($a, $b) => $b['views'] <=> $a['views']);
$pool = array_slice($msgs, 0, $TOP_N);

$prev = is_file($rotFile) ? (int) file_get_contents($rotFile) : -1;
$idx  = ($prev + 1) % count($pool);
@file_put_contents($rotFile, (string) $idx, LOCK_EX);

$top = $pool[$idx];
$top['url']   = "https://t.me/$CHANNEL/{$top['id']}";
$top['rank']  = $idx + 1;
$top['pool']  = count($pool);
if (mb_strlen($top['text']) > 480) $top['text'] = mb_substr($top['text'], 0, 480) . '…';

echo json_encode($top, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
