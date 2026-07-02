# Lavzen Hub - New Tab (Chrome extension)

Opens your self-hosted Lavzen Hub as the browser new-tab page, embedded full
screen.

## Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and select this `extension/` folder.
4. Open the extension options and enter your hub URL (for example
   `https://hub.example.com`).
5. Open a new tab.

## Files

- `manifest.json` - Manifest V3 definition; overrides the new-tab page.
- `newtab.html` / `newtab.js` - the full-screen iframe that loads your hub.
- `background.js` - a dynamic declarativeNetRequest rule that removes the
  `X-Frame-Options` and `Content-Security-Policy` response headers for the one
  host you configure, so the hub can be embedded.
- `options.html` / `options.js` - stores the hub URL.
- `icons/` - the extension icons.

See [../docs/EXTENSION.md](../docs/EXTENSION.md) for how it works and the
security rationale.
