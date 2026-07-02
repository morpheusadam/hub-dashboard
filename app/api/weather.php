<?php
/** Weather proxy — Open-Meteo (no API key). Locations come from Settings.
 * Returns { locations: [{name,temp,code}, ...] }. Auth-gated, cached 15 min. */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require __DIR__ . '/../lib_settings.php';
require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$cache = __DIR__ . '/../data/weather.json';
if (is_file($cache) && (time() - filemtime($cache) < 900)) { readfile($cache); exit; }

function fetch_json(string $url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => 'hub-dashboard']);
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return ($r !== false && $code === 200) ? json_decode($r, true) : null;
}
function city(string $name, float $lat, float $lon): array {
    $u = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,weather_code&timezone=auto";
    $d = fetch_json($u);
    return [
        'name' => $name,
        'temp' => isset($d['current']['temperature_2m']) ? round((float) $d['current']['temperature_2m']) : null,
        'code' => isset($d['current']['weather_code']) ? (int) $d['current']['weather_code'] : null,
    ];
}

$locations = [];
foreach ((get_settings()['weather']['locations'] ?? []) as $loc) {
    if (!isset($loc['lat'], $loc['lon'])) continue;
    $locations[] = city((string) ($loc['name'] ?? ''), (float) $loc['lat'], (float) $loc['lon']);
}

$out = json_encode(['locations' => $locations], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($locations) @file_put_contents($cache, $out, LOCK_EX);
echo $out;
