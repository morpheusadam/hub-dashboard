# AGENTS.md

Orientation for AI coding agents and new contributors. Read this before making
changes.

## What this project is

A self-hosted, single-user personal dashboard. A React front end (built to
static files) talks to a small PHP backend over JSON endpoints. State is stored
in flat JSON files under `app/data/`. There is no database and no server-side
framework.

## Stack

- Frontend: React 18, TypeScript, React Router, Vite. Source in `web/src/`.
- Backend: PHP 8.2, no framework. Files in `app/` and `app/api/`.
- Runtime: one `php:8.2-apache` container serving `app/` as the web root.
- Storage: JSON files in `app/data/` (git-ignored).

## Golden rules

1. Never commit secrets. `app/config.php` (password hash and token secret) and
   everything under `app/data/` are git-ignored. Do not add real tokens,
   passwords, hostnames or personal data to tracked files.
2. The deployed front end in `app/index.html` and `app/assets/` is a build
   artifact. Do not hand-edit it. Change `web/src/`, run the build, and copy the
   output (see below).
3. Keep endpoints keyless where possible. Existing data sources need no API key.
4. Preserve the security model: auth-gate every endpoint that returns private
   data, and call `assert_same_origin()` on every state-changing request.

## Build and deploy the front end

```bash
cd web
npm install          # first time only
npm run build        # outputs to web/dist
cp dist/index.html ../app/index.html
rm -f ../app/assets/index-*.js ../app/assets/index-*.css
cp dist/assets/index-*.js dist/assets/index-*.css ../app/assets/
```

The container mounts `app/` as `/var/www/html`, so copying into `app/` is the
deploy step. No container restart is needed.

## Backend contracts

All endpoints live in `app/api/*.php`. Unless noted, they require auth
(`require_auth_json()`), return JSON, and read config from `lib_settings.php`.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `auth.php` | GET/POST | Session check, login, logout |
| `data.php` | GET/POST | Board state (links, tasks) in `data/hub.json` |
| `notes.php` | GET/POST | Notes in `data/notes.json` |
| `settings.php` | GET/POST | User settings in `data/settings.json`; password change |
| `weather.php` | GET | Open-Meteo current weather per configured location |
| `news.php` | GET | Hacker News feed by topic, with cover images |
| `ytfa.php` | GET | Top videos of the week for configured YouTube channels |
| `tweet.php` | GET | Rotating trending post from a public Telegram channel |
| `trending.php` | GET | GitHub daily trending plus AI slice, with translated summaries |
| `projects.php` | GET | Serves `data/projects.json` (written by the host exporter) |
| `system.php` | GET/POST | Service health checks; Windows autostart toggle |
| `status.php` | GET | Backup status from `data/status.json` and log |
| `backup.php` | GET | Streams a ZIP of the whole app |
| `push.php` | POST | Optional git commit and push (needs `HUB_GIT_DIR`) |
| `icon.php` | GET | Favicon proxy and cache |
| `img.php` | GET | Image proxy and cache |
| `wallpapers.php` | GET | Public wallpaper URL list from settings |

Settings shape and defaults live in `app/lib_settings.php` (`settings_defaults()`).

## Frontend map

- `web/src/App.tsx` — auth gate, routing, the floating menu launcher, and global
  wallpaper and toast state.
- `web/src/api.ts` — the typed client for every endpoint.
- `web/src/pages/` — one file per route: `Board`, `Feed`, `News`, `Trends`,
  `Tasks`, `Notes`, `Backups`, `System`, `Guides`, `Settings`, `Palette`
  (command palette).
- `web/src/backgrounds.ts` — the minimal gradient set and rotation logic.
- `web/src/greetings.ts` — the creative greeting pool.
- `web/src/ui.tsx` — the SVG icon set and shared `Icon`, `Modal`, `Spinner`.
- `web/src/index.css` — all styles (single file, dark glassmorphism).

## How to add things

- New setting: add a default in `settings_defaults()` (`app/lib_settings.php`),
  add the field to the `Settings` type and a control in
  `web/src/pages/Settings.tsx`, and read it in the relevant endpoint via
  `get_settings()`.
- New page: create `web/src/pages/Foo.tsx`, add a `<Route>` and a `NAV` entry in
  `web/src/App.tsx`.
- New endpoint: create `app/api/foo.php`, `require lib.php` (and
  `lib_settings.php` if it needs config), gate it, and add a typed function in
  `web/src/api.ts`.

## Gotchas

- `assert_same_origin()` compares the Origin host against `HTTP_HOST` with any
  port stripped, so it works behind proxies and on non-standard ports.
- Endpoints cache to `app/data/*.json`; deleting a cache file forces a refresh.
- Icons are SVG only (`ui.tsx`); do not introduce emoji as structural icons.
- Motion respects `prefers-reduced-motion`; keep new transitions in the
  150 to 300 ms range.
