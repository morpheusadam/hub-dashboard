<?php
/**
 * Shared auth helpers for the personal hub (single user: Hesam).
 *
 * The password is never stored in plaintext: config.php holds a bcrypt hash plus a
 * random 256-bit secret. On login we hand the browser an AES-256-GCM **encrypted**
 * token cookie (valid 30 days). That encrypted token is the "encrypted credential
 * cached for a month" — the raw password is only ever verified, never stored client
 * side, and the cookie is HttpOnly + Secure so JS/XSS cannot read it.
 *
 * Token format:
 *   v2.<base64url(iv(12) | tag(16) | ciphertext)>      ← AES-256-GCM (authenticated)
 *   v1.<payload>.<hmac>  /  <payload>.<hmac>           ← legacy signed (still accepted
 *                                                         so existing sessions survive)
 */

declare(strict_types=1);

function cfg(): array
{
    static $c = null;
    if ($c === null) {
        $c = require __DIR__ . '/config.php';
    }
    return $c;
}

function b64url_encode(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function b64url_decode(string $s): string
{
    return (string) base64_decode(strtr($s, '-_', '+/'), true);
}

/** 32-byte symmetric key derived from the config secret. */
function token_key(): string
{
    return hash('sha256', cfg()['secret'] . '|hub-token-v2', true);
}

function make_token(int $exp): string
{
    $payload = json_encode(['exp' => $exp, 'u' => 'Hesam', 'n' => bin2hex(random_bytes(8))]);

    if (function_exists('openssl_encrypt')) {
        $iv  = random_bytes(12);
        $tag = '';
        $ct  = openssl_encrypt($payload, 'aes-256-gcm', token_key(), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        if ($ct !== false) {
            return 'v2.' . b64url_encode($iv . $tag . $ct);
        }
    }

    // Fallback: signed (not encrypted) token if openssl is unavailable.
    $p = b64url_encode($payload);
    return 'v1.' . $p . '.' . hash_hmac('sha256', $p, cfg()['secret']);
}

function verify_token(?string $token): bool
{
    if (!$token) {
        return false;
    }
    try {
        // --- v2: AES-256-GCM encrypted + authenticated ---
        if (strncmp($token, 'v2.', 3) === 0) {
            if (!function_exists('openssl_decrypt')) {
                return false;
            }
            $raw = b64url_decode(substr($token, 3));
            if (strlen($raw) < 29) {
                return false;
            }
            $iv  = substr($raw, 0, 12);
            $tag = substr($raw, 12, 16);
            $ct  = substr($raw, 28);
            $pt  = openssl_decrypt($ct, 'aes-256-gcm', token_key(), OPENSSL_RAW_DATA, $iv, $tag);
            if ($pt === false) {
                return false;
            }
            $d = json_decode($pt, true);
            return is_array($d) && !empty($d['exp']) && time() <= (int) $d['exp'];
        }

        // --- legacy signed token (v1.payload.sig OR payload.sig) ---
        $t = (strncmp($token, 'v1.', 3) === 0) ? substr($token, 3) : $token;
        if (substr_count($t, '.') !== 1) {
            return false;
        }
        [$payload, $sig] = explode('.', $t, 2);
        $expected = hash_hmac('sha256', $payload, cfg()['secret']);
        if (!hash_equals($expected, $sig)) {
            return false;
        }
        $json = b64url_decode($payload);
        $data = $json ? json_decode($json, true) : null;
        return is_array($data) && !empty($data['exp']) && time() <= (int) $data['exp'];
    } catch (\Throwable $e) {
        return false;
    }
}

function is_authed(): bool
{
    $c = cfg();
    return isset($_COOKIE[$c['cookie_name']]) && verify_token($_COOKIE[$c['cookie_name']]);
}

/**
 * Issue the auth cookie. The token is always valid up to `ttl` (30 days). When
 * $remember is false the browser cookie is a session cookie (cleared on close);
 * when true it is persisted for the full 30 days.
 */
function issue_cookie(bool $remember = true): int
{
    $c   = cfg();
    $exp = time() + (int) $c['ttl'];
    setcookie($c['cookie_name'], make_token($exp), [
        'expires'  => $remember ? $exp : 0,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return $exp;
}

function clear_cookie(): void
{
    $c = cfg();
    setcookie($c['cookie_name'], '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function require_auth_json(): void
{
    if (!is_authed()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'unauthorized']);
        exit;
    }
}

/**
 * Defense-in-depth CSRF guard for state-changing API calls. If the browser sends
 * an Origin header it must match our own host; absent Origin (e.g. same-origin
 * navigations) is allowed. SameSite=Lax already blocks cross-site POSTs.
 */
function assert_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }
    $oh   = parse_url($origin, PHP_URL_HOST);
    // Compare host only; HTTP_HOST may carry a :port (non-standard port setups)
    // while the Origin header's host does not.
    $host = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
    if ($oh === null || strcasecmp((string) $oh, (string) $host) !== 0) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'bad origin']);
        exit;
    }
}
