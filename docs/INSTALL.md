# Installation

## Requirements

- Docker with the Compose plugin, or any PHP 8.2+ web server with the `zip`,
  `curl` and `openssl` extensions.
- Node.js 18+ only if you intend to rebuild the front end.

## Option A: Docker (recommended)

```bash
git clone https://github.com/<your-username>/hub-dashboard.git
cd hub-dashboard
docker compose -f docker/docker-compose.example.yml up -d --build
```

- Open `http://localhost:8086/setup.php` and choose a password. This writes
  `app/config.php`.
- Open `http://localhost:8086/` and sign in.
- Open Settings to configure weather, channels, services and the rest.

Put a reverse proxy (Caddy, nginx, Traefik) or a Cloudflare Tunnel in front for
HTTPS. The compose file binds to `127.0.0.1:8086` by default.

## Option B: Any PHP host

1. Copy the contents of `app/` to your web root.
2. Ensure `app/data/` is writable by the web server user.
3. Enable URL rewriting so the SPA fallback in `.htaccess` works (Apache
   `mod_rewrite` with `AllowOverride All`, or the equivalent nginx rule that
   routes unknown paths to `index.html` while leaving `/api` and `/assets`
   alone).
4. Visit `/setup.php` to create `config.php`, then sign in.

## Rebuilding the front end

Only needed if you change anything under `web/`.

```bash
cd web
npm install
npm run build
cp dist/index.html ../app/index.html
rm -f ../app/assets/index-*.js ../app/assets/index-*.css
cp dist/assets/index-*.js dist/assets/index-*.css ../app/assets/
```

## Updating

Pull the latest code, rebuild the front end if `web/` changed, and copy the
build into `app/`. Your `config.php` and everything under `app/data/` are left
untouched.

## Uninstall

Stop and remove the container, then delete the directory. All state was in
`app/data/`; there is nothing else to clean up.
