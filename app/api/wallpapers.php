<?php
/** Public wallpaper list for the background rotation. Returns the URLs configured
 * in Settings, plus any bundled manifest at assets/wallpapers/index.json. Not
 * auth-gated (image URLs are not sensitive and the login screen uses them too). */
declare(strict_types=1);
require __DIR__ . '/../lib_settings.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$items = [];

// user-configured image URLs (Settings -> Wallpapers). When empty, the frontend
// rotates through its built-in minimal gradient set.
foreach ((get_settings()['wallpapers']['images'] ?? []) as $url) {
    $url = trim((string) $url);
    if ($url !== '' && (preg_match('#^https?://#i', $url) || $url[0] === '/')) {
        $items[] = ['cat' => 'custom', 'url' => $url];
    }
}

echo json_encode(['items' => $items], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
