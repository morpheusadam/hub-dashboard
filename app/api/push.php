<?php
/**
 * Optional "Push" endpoint — stages the app directory, commits with today's date,
 * and pushes to a Git remote. Disabled unless HUB_GIT_DIR is set. Point it at a
 * git directory that lives OUTSIDE the web root and whose remote already carries
 * its own credentials (so no token is ever stored in this repo or web-reachable).
 *
 *   docker env:  HUB_GIT_DIR=/data/.hub_git   HUB_GIT_HOME=/data
 */
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_auth_json();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only']);
    exit;
}
assert_same_origin();

$GIT_DIR  = getenv('HUB_GIT_DIR') ?: '';
$GIT_HOME = getenv('HUB_GIT_HOME') ?: (getenv('HOME') ?: '/tmp');
$WORKTREE = realpath(__DIR__ . '/..');
$today    = date('Y-m-d');

if ($GIT_DIR === '' || !is_dir($GIT_DIR)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Push is not configured (set HUB_GIT_DIR).']);
    exit;
}

function git(array $args, string $gitDir, string $workTree): array {
    global $GIT_HOME;
    if (!function_exists('proc_open')) return [255, 'proc_open unavailable'];
    $cmd  = array_merge(['git', '--git-dir=' . $gitDir, '--work-tree=' . $workTree], $args);
    $desc = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $env  = [
        'HOME' => $GIT_HOME,
        'PATH' => getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin',
        'GIT_TERMINAL_PROMPT' => '0',
    ];
    $p = proc_open($cmd, $desc, $pipes, $workTree, $env);
    if (!is_resource($p)) return [255, 'proc_open failed'];
    $out = stream_get_contents($pipes[1]); fclose($pipes[1]);
    $err = stream_get_contents($pipes[2]); fclose($pipes[2]);
    return [proc_close($p), trim($out . "\n" . $err)];
}

[$ca, $oa] = git(['add', '-A'], $GIT_DIR, $WORKTREE);
[$cc, $oc] = git(['commit', '-m', $today], $GIT_DIR, $WORKTREE);
$committed = ($cc === 0);
$nothing   = (!$committed && stripos($oc, 'nothing to commit') !== false);
[$cp, $op] = git(['push', 'origin', 'HEAD:main'], $GIT_DIR, $WORKTREE);
$ok = ($cp === 0);

// Defensive: never leak a token in the response.
$scrub = static fn(string $s): string => preg_replace('/ghp_[A-Za-z0-9_]+/', 'ghp_***', $s);

$msg = $ok
    ? ($committed ? "Pushed ✓ ($today)" : ($nothing ? 'Nothing to commit — repo is up to date ✓' : "Pushed ✓ ($today)"))
    : 'Push failed';

echo json_encode([
    'ok'        => $ok,
    'date'      => $today,
    'committed' => $committed,
    'message'   => $msg,
    'detail'    => $scrub($op !== '' ? $op : $oc),
], JSON_UNESCAPED_UNICODE);
