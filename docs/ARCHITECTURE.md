# Architecture

## Overview

```
Browser (React SPA)  --fetch /api/*.php-->  PHP (Apache)  --curl-->  public sources
        |                                        |
   localStorage cache                       app/data/*.json (state + caches)
```

A React single-page app is built to static files and served by Apache from the
same origin as the PHP endpoints. There is no build step or Node.js at runtime,
and no database. All state and all caches are flat JSON files under `app/data/`.

## Request flow

1. The browser loads `index.html` and the built JS/CSS from `app/assets/`.
2. React checks the session via `GET /api/auth.php`. If unauthenticated it shows
   the login form; otherwise it renders the shell.
3. Pages call typed functions in `web/src/api.ts`, which fetch `/api/*.php` with
   the `hub_auth` cookie attached (same-origin).
4. Each endpoint verifies the cookie, reads or writes `app/data/`, optionally
   fetches a public source with a short cache, and returns JSON.

## Authentication

- The password is stored only as a bcrypt hash in `config.php`.
- On login, the server issues a token of the form `v2.<base64url(iv|tag|ct)>`,
  an AES-256-GCM encryption of a small JSON payload (`exp`, user, nonce) keyed by
  a SHA-256 of the config secret. The token is set as an HttpOnly, Secure,
  SameSite=Lax cookie.
- A legacy HMAC-signed token format is still accepted so older sessions survive
  upgrades.
- State-changing endpoints call `assert_same_origin()`, which compares the
  request Origin host to `HTTP_HOST` (with any port stripped). SameSite=Lax
  already blocks cross-site form posts; this is defense in depth.

## Data sources

All are public and need no API key:

- Weather: Open-Meteo current conditions.
- News: the Hacker News Algolia search API, enriched with Open Graph cover
  images fetched in parallel.
- Videos: YouTube channel RSS feeds (which include view counts).
- Trending post: the public web preview of a Telegram channel (`t.me/s/...`).
- Trending repositories: the `github.com/trending` page plus the unauthenticated
  GitHub search API for the AI slice.
- Summaries: a free Google translate endpoint, called in parallel.

## Cross-process data (optional)

Some data cannot be fetched by the PHP container, for example a project
database on another network or your local git repositories. For those, a host
script (`scripts/hub-refresh.py`) runs on a schedule, gathers the data, and
writes `app/data/projects.json`. The `projects.php` endpoint simply serves that
file. This keeps the container simple and avoids granting it database or host
access.

## Frontend

- Routing and the global shell (floating menu, wallpaper, toasts) live in
  `web/src/App.tsx`.
- Each route is a file in `web/src/pages/`.
- The floating menu is a draggable, edge-docked launcher; its vertical position
  is persisted in `localStorage`.
- Backgrounds are a small curated set of CSS gradients (`web/src/backgrounds.ts`)
  that rotate every two hours, or user-supplied image URLs.
- All styling is one dark, glassmorphism stylesheet, `web/src/index.css`.

## Deployment

One `php:8.2-apache` container serves `app/` as the web root via a bind mount.
Put any reverse proxy in front for TLS. Because everything is a bind-mounted
file, deploying a front-end change is just copying the new build into `app/`;
no container restart is required.
