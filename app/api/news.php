<?php
/** Tech news proxy — Hacker News (Algolia, no key) + og:image enrichment (article
 * covers). Auth-gated, cached 2 min so a page refresh shows near-live articles. */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$topic = preg_replace('/[^a-z]/', '', strtolower((string)($_GET['topic'] ?? 'tech')));
$map = [
  'tech'        => 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30',
  'ai'          => 'https://hn.algolia.com/api/v1/search?query=AI%20LLM%20machine%20learning&tags=story&hitsPerPage=30',
  'programming' => 'https://hn.algolia.com/api/v1/search?query=programming%20language&tags=story&hitsPerPage=30',
  'devops'      => 'https://hn.algolia.com/api/v1/search?query=kubernetes%20docker%20devops%20cloud&tags=story&hitsPerPage=30',
  'show'        => 'https://hn.algolia.com/api/v1/search?tags=show_hn&hitsPerPage=30',
];
if (!isset($map[$topic])) $topic = 'tech';

$cacheDir = __DIR__ . '/../data';
$cache = "$cacheDir/news-$topic.json";
if (is_file($cache) && (time() - filemtime($cache) < 120)) { readfile($cache); exit; }

function ago(int $ts): string {
  $d = max(0, time() - $ts);
  if ($d < 3600) return intdiv($d, 60) . 'm ago';
  if ($d < 86400) return intdiv($d, 3600) . 'h ago';
  return intdiv($d, 86400) . 'd ago';
}

$ch = curl_init($map[$topic]);
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_USERAGENT => 'lavzen-hub-news']);
$raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);

$items = [];
if ($raw !== false && $code === 200) {
  $d = json_decode($raw, true);
  foreach (($d['hits'] ?? []) as $h) {
    $title = $h['title'] ?? $h['story_title'] ?? null;
    if (!$title) continue;
    $isHn = empty($h['url']);
    $url = $h['url'] ?? ('https://news.ycombinator.com/item?id=' . ($h['objectID'] ?? ''));
    $host = parse_url($url, PHP_URL_HOST); $src = $host ? preg_replace('/^www\./', '', $host) : 'news.ycombinator.com';
    $items[] = [
      'title' => $title, 'url' => $url, 'source' => $src, 'image' => null, 'external' => !$isHn,
      'points' => isset($h['points']) ? (int)$h['points'] : null,
      'comments' => isset($h['num_comments']) ? (int)$h['num_comments'] : null,
      'age' => isset($h['created_at_i']) ? ago((int)$h['created_at_i']) : null,
    ];
    if (count($items) >= 25) break;
  }
}

// --- enrich with og:image (parallel, only external URLs, capped) ---
$mh = curl_multi_init();
$handles = [];
foreach ($items as $i => $it) {
  if (!$it['external'] || $i >= 24) continue;
  $c = curl_init($it['url']);
  curl_setopt_array($c, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 6,
    CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_RANGE => '0-180000',
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; lavzen-hub/1.0)',
  ]);
  curl_multi_add_handle($mh, $c); $handles[$i] = $c;
}
if ($handles) {
  $running = null;
  do { curl_multi_exec($mh, $running); curl_multi_select($mh, 0.5); } while ($running > 0);
  foreach ($handles as $i => $c) {
    $html = curl_multi_getcontent($c);
    if ($html) {
      if (preg_match('/<meta[^>]+(?:property|name)=["\'](?:og:image|og:image:url|twitter:image)["\'][^>]+content=["\']([^"\']+)/i', $html, $m)
       || preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\']/i', $html, $m)) {
        $img = html_entity_decode(trim($m[1]));
        if (strpos($img, '//') === 0) $img = 'https:' . $img;
        if (preg_match('#^https?://#i', $img)) $items[$i]['image'] = $img;
      }
    }
    curl_multi_remove_handle($mh, $c); curl_close($c);
  }
}
curl_multi_close($mh);

// strip the internal flag from output
foreach ($items as &$it) unset($it['external']);
unset($it);

$out = json_encode(['topic' => $topic, 'items' => $items], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($items) @file_put_contents($cache, $out, LOCK_EX);
echo $out;
