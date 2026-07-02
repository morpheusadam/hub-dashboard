<?php
/**
 * Full-service backup → downloads a .zip of the whole hub (code + data + KeeWeb),
 * excluding regenerable bloat (vendor/, favicon cache, tmp). Auth-gated; triggered
 * by a normal navigation so the browser saves the file.
 */
declare(strict_types=1);
require __DIR__ . '/../lib.php';

header('X-Robots-Tag: noindex, nofollow');
if (!is_authed()) { http_response_code(403); exit('forbidden'); }
if (!class_exists('ZipArchive')) { http_response_code(500); exit('zip unavailable'); }

$root = realpath(__DIR__ . '/..');
$date = date('Y-m-d');
$zipName = "hub-backup-$date.zip";

$tmp = tempnam(sys_get_temp_dir(), 'sambak');
$zip = new ZipArchive();
if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    http_response_code(500); exit('cannot create archive');
}

$exDir = ['/vendor/', '/data/icons/', '/.git/'];   // regenerable / cache
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);
foreach ($it as $file) {
    $path = $file->getPathname();
    $rel  = str_replace('\\', '/', substr($path, strlen($root) + 1));
    $probe = '/' . $rel . '/';
    foreach ($exDir as $x) { if (strpos($probe, $x) !== false) { continue 2; } }
    if (preg_match('/\.(tmp|bak)$/i', $file->getFilename())) continue;
    if ($file->isDir()) { $zip->addEmptyDir('hub/' . $rel); }
    else { $zip->addFile($path, 'hub/' . $rel); }
}
$zip->close();

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zipName . '"');
header('Content-Length: ' . filesize($tmp));
header('Cache-Control: no-store');
readfile($tmp);
@unlink($tmp);
