<?php
/** Tech YouTube — most-viewed videos of the last 7 days across curated technology,
 * AI and coding channels (news channels intentionally excluded). Uses public RSS
 * feeds (include view counts). No API key. Auth-gated, cached 1h. */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require __DIR__ . '/../lib_settings.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$cache = __DIR__ . '/../data/ytfa.json';
if (is_file($cache) && (time() - filemtime($cache) < 3600)) { readfile($cache); exit; }

$UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
$dataDir = __DIR__ . '/../data';

// Channel list is user-configurable (Settings -> YouTube). Accepts UC ids or @handles.
$channels = get_settings()['youtube']['channels'] ?? [];
if (!$channels) { echo json_encode(['items' => [], 'generated' => date('c')]); exit; }

// resolve @handles -> UC id (cached)
$idsFile = "$dataDir/yt-ids.json";
$idcache = is_file($idsFile) ? (json_decode((string)file_get_contents($idsFile), true) ?: []) : [];
$ids = [];
foreach ($channels as $c) {
    if (preg_match('/^UC[A-Za-z0-9_-]{22}$/', $c)) { $ids[] = $c; continue; }
    $h = ltrim($c, '@');
    if (!empty($idcache[$h])) { $ids[] = $idcache[$h]; continue; }
    $ch = curl_init("https://www.youtube.com/@$h");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 8, CURLOPT_USERAGENT => $UA]);
    $html = curl_exec($ch); curl_close($ch);
    if ($html && preg_match('/(UC[A-Za-z0-9_-]{22})/', $html, $m)) { $idcache[$h] = $m[1]; $ids[] = $m[1]; }
}
@file_put_contents($idsFile, json_encode($idcache));
$ids = array_values(array_unique($ids));

// fetch all RSS feeds in parallel
$mh = curl_multi_init(); $handles = [];
foreach ($ids as $i => $id) {
    $c = curl_init("https://www.youtube.com/feeds/videos.xml?channel_id=$id");
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => $UA]);
    curl_multi_add_handle($mh, $c); $handles[$i] = $c;
}
$running = null;
do { curl_multi_exec($mh, $running); curl_multi_select($mh, 0.5); } while ($running > 0);

$cutoff = time() - 7 * 86400;
$items = [];
foreach ($handles as $c) {
    $xml = curl_multi_getcontent($c); curl_multi_remove_handle($mh, $c); curl_close($c);
    if (!$xml) continue;
    $sx = @simplexml_load_string($xml); if (!$sx) continue;
    $chTitle = (string)$sx->title;
    foreach ($sx->entry as $e) {
        $yt = $e->children('http://www.youtube.com/xml/schemas/2015');
        $media = $e->children('http://search.yahoo.com/mrss/');
        $vid = (string)$yt->videoId;
        $pub = strtotime((string)$e->published);
        if (!$vid || !$pub || $pub < $cutoff) continue;
        $views = 0;
        if (isset($media->group->community->statistics)) {
            $views = (int)$media->group->community->statistics->attributes()->views;
        }
        $items[] = [
            'title'   => (string)$e->title,
            'videoId' => $vid,
            'url'     => "https://www.youtube.com/watch?v=$vid",
            'thumb'   => "https://i.ytimg.com/vi/$vid/hqdefault.jpg",
            'channel' => $chTitle,
            'views'   => $views,
            'published' => date('c', $pub),
        ];
    }
}
curl_multi_close($mh);
usort($items, fn($a, $b) => $b['views'] <=> $a['views']);
$items = array_slice($items, 0, 10);

$out = json_encode(['items' => $items, 'generated' => date('c')], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($items) @file_put_contents($cache, $out, LOCK_EX);
echo $out;
