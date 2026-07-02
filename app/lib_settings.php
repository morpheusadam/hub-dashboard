<?php
/**
 * User-configurable settings, persisted to data/settings.json and editable from
 * the in-app Settings page. Sensible defaults let the dashboard run out of the
 * box with no configuration; anything the user saves is layered on top.
 */
declare(strict_types=1);

function settings_defaults(): array
{
    return [
        // Optional display name used in the home-screen greeting. Empty = none.
        'owner' => '',
        // Weather widget: any number of locations (Open-Meteo, no API key).
        'weather' => [
            'locations' => [
                ['name' => 'Tehran',   'lat' => 35.6892, 'lon' => 51.3890],
                ['name' => 'Istanbul', 'lat' => 41.0082, 'lon' => 28.9784],
            ],
        ],
        // YouTube "top of the week" widget: list of channel IDs (UC...).
        // Defaults are popular technology / AI / coding channels.
        'youtube' => [
            'channels' => [
                'UCBJycsmduvYEL83R_U4JriQ', // MKBHD
                'UCsBjURrPoezykLs9EqgamOA', // Fireship
                'UCddiUEpeqJcYeBxX1IVBKvQ', // The Verge
                'UCXuqSBlHAE6Xw-yeJA0Tunw', // Linus Tech Tips
                'UC4QZ_LsYcvcq7qOsOhpAX4A', // ColdFusion
                'UC8ENHE5xdFSwx71u3fDH5Xw', // ThePrimeagen
                'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
                'UCbRP3c757lWg9M-U7TyEkXA', // Theo (t3.gg)
                'UC9x0AN7BWHpCDHSm9NiJFJQ', // NetworkChuck
                'UCbfYPyITQ-7l4upoX8nvctg', // Two Minute Papers
                'UChpleBmo18P08aKCIgti38g', // Matt Wolfe
            ],
        ],
        // Trending tweet widget: a public Telegram channel to mirror. Empty = off.
        'tweets' => ['telegramChannel' => ''],
        // Service/domain health widget (System page). baseDomain 'example.com'
        // with subs ['app','mail'] checks https://app.example.com etc. Empty = off.
        'services' => ['baseDomain' => '', 'domains' => []],
        // Background wallpapers: a list of image URLs to rotate through. Empty
        // falls back to the built-in CSS gradients (no bundled images).
        'wallpapers' => ['images' => []],
        // Trends page: language for the auto one-line summaries. '' disables it.
        'trends' => ['translateTo' => 'en'],
        // Optional GitHub token (fine-grained, read-only) for the account repo list.
        'github' => ['token' => '', 'username' => ''],
    ];
}

/** Effective settings = defaults deep-merged with the saved overrides. */
function get_settings(): array
{
    static $s = null;
    if ($s !== null) {
        return $s;
    }
    $file = __DIR__ . '/data/settings.json';
    $user = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    $s = array_replace_recursive(settings_defaults(), is_array($user) ? $user : []);
    return $s;
}

/** Deep-merge a partial settings array into data/settings.json (atomic write). */
function save_settings(array $partial): bool
{
    $file = __DIR__ . '/data/settings.json';
    $cur  = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    $next = array_replace_recursive($cur, $partial);
    $tmp  = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, json_encode($next, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) === false || !rename($tmp, $file)) {
        @unlink($tmp);
        return false;
    }
    return true;
}
