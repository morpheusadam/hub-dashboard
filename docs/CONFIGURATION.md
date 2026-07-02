# Configuration

Two files hold configuration. Both are git-ignored.

## app/config.php (secrets)

Created by `/setup.php` or copied from `config.example.php`. Holds:

- `password_hash` — bcrypt hash of your login password.
- `secret` — 64 hex characters used to encrypt the session token.
- `cookie_name` — the auth cookie name.
- `ttl` — session lifetime in seconds (default 2592000, thirty days).

Change your password from the Settings page, or delete `config.php` and rerun
`/setup.php`.

## app/data/settings.json (preferences)

Edited from the in-app Settings page. Missing keys fall back to the defaults in
`app/lib_settings.php`. Full shape:

```json
{
  "owner": "",
  "weather": {
    "locations": [
      { "name": "Tehran", "lat": 35.6892, "lon": 51.389 },
      { "name": "Istanbul", "lat": 41.0082, "lon": 28.9784 }
    ]
  },
  "youtube": { "channels": ["UC..."] },
  "tweets": { "telegramChannel": "" },
  "services": { "baseDomain": "", "domains": [] },
  "wallpapers": { "images": [] },
  "trends": { "translateTo": "en" },
  "github": { "token": "", "username": "" }
}
```

Field notes:

- `owner` — optional name shown in the home greeting.
- `weather.locations` — any number of points; the widget shows the first three.
- `youtube.channels` — channel IDs (`UC...`) or `@handles`. Handles are resolved
  to IDs and cached in `data/yt-ids.json`.
- `tweets.telegramChannel` — a public channel name (no `@`). Empty hides the
  widget.
- `services` — with `baseDomain` set to `example.com` and `domains` set to
  `["app", "mail"]`, the System page checks `https://app.example.com` and
  `https://mail.example.com`. Leave `baseDomain` empty to list full hostnames in
  `domains`.
- `wallpapers.images` — image URLs to rotate through. Empty uses the built-in
  minimal gradients.
- `trends.translateTo` — a language code such as `fa`, `es` or `de` for the
  auto summaries on the Trends page. Use `en` to keep the original English and
  skip translation.
- `github` — an optional read-only token and username for listing repositories.

## Environment variables (optional)

Set on the container:

- `HUB_GIT_DIR` and `HUB_GIT_HOME` — enable the "Push to Git" action. Point
  `HUB_GIT_DIR` at a git directory outside the web root whose remote already has
  credentials. Without `HUB_GIT_DIR`, the push action is disabled.

## Caching

Each data endpoint caches its result to a JSON file under `app/data/`. To force
a refresh, delete the relevant cache file (for example `data/news-tech.json` or
`data/trending.json`).
