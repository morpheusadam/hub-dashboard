<?php
/**
 * Copy this file to config.php and fill it in, OR open /setup.php once in the
 * browser to generate config.php automatically (recommended).
 *
 * config.php holds your login secret and is git-ignored. Never commit it.
 */
return [
    // bcrypt hash of your login password. Generate one with:
    //   php -r "echo password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
    'password_hash' => '$2y$10$REPLACE_WITH_YOUR_OWN_BCRYPT_HASH_000000000000000000000',

    // 256-bit random secret used to encrypt the auth token. Generate one with:
    //   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
    'secret'        => 'REPLACE_WITH_A_RANDOM_64_CHAR_HEX_STRING',

    // Name of the auth cookie and how long a session lasts (seconds).
    'cookie_name'   => 'hub_auth',
    'ttl'           => 2592000, // 30 days
];
