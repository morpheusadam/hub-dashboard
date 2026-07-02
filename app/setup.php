<?php
/**
 * First-run setup. Open /setup.php once in the browser to choose a login
 * password; it generates config.php (bcrypt hash + a fresh random secret).
 * Refuses to run once config.php exists, so it is safe to leave in place.
 */
declare(strict_types=1);
$cfgFile = __DIR__ . '/config.php';

if (is_file($cfgFile)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Already configured. Delete config.php to run setup again.");
}

$err = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $pw  = (string) ($_POST['password'] ?? '');
    $pw2 = (string) ($_POST['confirm'] ?? '');
    if (strlen($pw) < 8) {
        $err = 'Password must be at least 8 characters.';
    } elseif ($pw !== $pw2) {
        $err = 'Passwords do not match.';
    } else {
        $cfg = [
            'password_hash' => password_hash($pw, PASSWORD_DEFAULT),
            'secret'        => bin2hex(random_bytes(32)),
            'cookie_name'   => 'hub_auth',
            'ttl'           => 2592000,
        ];
        $php = "<?php\nreturn " . var_export($cfg, true) . ";\n";
        if (@file_put_contents($cfgFile, $php, LOCK_EX) !== false) {
            header('Content-Type: text/html; charset=utf-8');
            exit('<!doctype html><meta charset="utf-8"><title>Setup complete</title>'
                . '<body style="font-family:system-ui;background:#0b0b12;color:#eaeaf0;display:grid;place-items:center;height:100vh;margin:0">'
                . '<div style="max-width:440px;padding:32px;border:1px solid #ffffff22;border-radius:16px;background:#14141c">'
                . '<h2 style="margin:0 0 10px">Setup complete</h2>'
                . '<p style="color:#a6a8b4;line-height:1.6">config.php was created. <a style="color:#a3e635" href="/">Open the dashboard</a> and sign in with your new password.</p>'
                . '<p style="color:#6c6e7c;font-size:13px">For extra safety you may now delete setup.php.</p></div></body>');
        }
        $err = 'Could not write config.php. Check that the app directory is writable by the web server.';
    }
}
header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<meta charset="utf-8">
<title>Hub setup</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<body style="font-family:system-ui;background:#0b0b12;color:#eaeaf0;display:grid;place-items:center;min-height:100vh;margin:0">
  <form method="post" style="max-width:420px;width:90%;padding:32px;border:1px solid #ffffff22;border-radius:16px;background:#14141c">
    <h1 style="margin:0 0 4px;font-size:22px">Set up your hub</h1>
    <p style="color:#a6a8b4;margin:0 0 20px">Choose a password to protect the dashboard.</p>
    <?php if ($err): ?><p style="color:#fb7185;margin:0 0 14px"><?= htmlspecialchars($err) ?></p><?php endif; ?>
    <label style="display:block;font-size:13px;color:#a6a8b4;margin-bottom:6px">Password</label>
    <input name="password" type="password" autofocus required minlength="8"
      style="width:100%;box-sizing:border-box;padding:11px 13px;margin-bottom:14px;border-radius:10px;border:1px solid #ffffff22;background:#0b0b12;color:#fff">
    <label style="display:block;font-size:13px;color:#a6a8b4;margin-bottom:6px">Confirm password</label>
    <input name="confirm" type="password" required minlength="8"
      style="width:100%;box-sizing:border-box;padding:11px 13px;margin-bottom:20px;border-radius:10px;border:1px solid #ffffff22;background:#0b0b12;color:#fff">
    <button style="width:100%;padding:12px;border-radius:10px;border:0;background:#a3e635;color:#07070a;font-weight:700;font-size:15px;cursor:pointer">Create config</button>
  </form>
</body>
