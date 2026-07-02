<?php
/** Trending on GitHub — daily-trending repos (scraped from github.com/trending)
 * plus an AI slice (the AI-flavoured trending rows, topped up from the token-free
 * GitHub search API by AI topic). No API key. Auth-gated, cached 6h ("that day"). */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require __DIR__ . '/../lib_settings.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$cache = __DIR__ . '/../data/trending.json';
if (is_file($cache) && (time() - filemtime($cache) < 6 * 3600)) { readfile($cache); exit; }

$UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';

function http_get(string $url, string $ua, array $headers = []): string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_USERAGENT      => $ua,
        CURLOPT_HTTPHEADER     => $headers,
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($body !== false && $code === 200) ? (string) $body : '';
}

/** Translate a batch of English strings to the target language (Google gtx, no
 * key), in parallel. Returns [original => translated]; failures are omitted. */
function translate_fa(array $texts, string $ua, string $tl = 'fa'): array {
    $texts = array_values(array_unique(array_filter(array_map('strval', $texts), fn($t) => trim($t) !== '')));
    if (!$texts) return [];
    $mh = curl_multi_init();
    $handles = [];
    foreach ($texts as $i => $t) {
        $c = curl_init('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' . rawurlencode($tl) . '&dt=t&q=' . rawurlencode($t));
        curl_setopt_array($c, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_USERAGENT => $ua, CURLOPT_SSL_VERIFYPEER => false,
        ]);
        curl_multi_add_handle($mh, $c);
        $handles[$i] = $c;
    }
    $running = null;
    do { curl_multi_exec($mh, $running); curl_multi_select($mh, 0.5); } while ($running > 0);
    $out = [];
    foreach ($handles as $i => $c) {
        $body = curl_multi_getcontent($c);
        curl_multi_remove_handle($mh, $c); curl_close($c);
        if (!$body) continue;
        $d = json_decode($body, true);
        if (!is_array($d) || !isset($d[0]) || !is_array($d[0])) continue;
        $fa = '';
        foreach ($d[0] as $seg) { if (isset($seg[0])) $fa .= $seg[0]; }
        $fa = trim($fa);
        if ($fa !== '') $out[$texts[$i]] = $fa;
    }
    curl_multi_close($mh);
    return $out;
}

// ── scrape the daily trending page ──
$html = http_get('https://github.com/trending?since=daily', $UA);
$repos = [];
if ($html !== '') {
    $parts = preg_split('#<article class="Box-row">#', $html);
    array_shift($parts); // drop the pre-list prefix
    foreach ($parts as $block) {
        if (!preg_match('#<h2[^>]*>\s*<a[^>]+href="/([^"?]+)"#s', $block, $mm)) continue;
        $full = trim($mm[1], "/ \t\n");
        if (substr_count($full, '/') !== 1) continue;
        $desc = '';
        if (preg_match('#<p class="col-9[^"]*"[^>]*>(.*?)</p>#s', $block, $dm)) {
            $desc = trim(html_entity_decode(strip_tags($dm[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
        $lang = null;
        if (preg_match('#itemprop="programmingLanguage">([^<]+)<#', $block, $lm)) $lang = trim($lm[1]);
        $stars = null;
        if (preg_match('#([\d,]+)\s+stars today#', $block, $sm)) $stars = (int) str_replace(',', '', $sm[1]);
        $repos[] = ['name' => $full, 'url' => "https://github.com/$full", 'desc' => $desc, 'lang' => $lang, 'starsToday' => $stars, 'stars' => null];
        if (count($repos) >= 20) break;
    }
}

// ── AI slice: AI-flavoured trending rows, topped up from the search API ──
$kw = '/\b(ai|llm|llms|gpt|genai|agent|agents|agentic|ml|neural|diffusion|rag|prompt|prompts|chatbot|transformer|deep.?learning|machine.?learning)\b/i';
$ai = [];
foreach ($repos as $r) {
    if (preg_match($kw, $r['name'] . ' ' . $r['desc'])) $ai[] = $r;
}
if (count($ai) < 8) {
    $since = gmdate('Y-m-d', time() - 7 * 86400);
    $sjson = http_get(
        "https://api.github.com/search/repositories?q=topic:ai+pushed:%3E=$since&sort=stars&order=desc&per_page=12",
        $UA,
        ['Accept: application/vnd.github+json']
    );
    $j = $sjson !== '' ? json_decode($sjson, true) : null;
    $have = array_column($ai, 'name');
    foreach (($j['items'] ?? []) as $it) {
        $full = (string) ($it['full_name'] ?? '');
        if ($full === '' || in_array($full, $have, true)) continue;
        $ai[] = [
            'name'       => $full,
            'url'        => (string) ($it['html_url'] ?? "https://github.com/$full"),
            'desc'       => (string) ($it['description'] ?? ''),
            'lang'       => $it['language'] ?? null,
            'starsToday' => null,
            'stars'      => isset($it['stargazers_count']) ? (int) $it['stargazers_count'] : null,
        ];
        if (count($ai) >= 12) break;
    }
}
$ai = array_slice($ai, 0, 12);

// ── One-line summaries in the configured language (Settings -> Trends). ──
$tl = trim((string) (get_settings()['trends']['translateTo'] ?? ''));
$fa = ($tl !== '' && strtolower($tl) !== 'en')
    ? translate_fa(array_merge(array_column($repos, 'desc'), array_column($ai, 'desc')), $UA, $tl)
    : [];
$attach = function (array &$items) use ($fa) {
    foreach ($items as &$it) { $it['fa'] = $fa[$it['desc']] ?? ''; }
    unset($it);
};
$attach($repos);
$attach($ai);

$out = json_encode(['repos' => $repos, 'ai' => $ai, 'generated' => time()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($repos || $ai) @file_put_contents($cache, $out, LOCK_EX);
echo $out;
