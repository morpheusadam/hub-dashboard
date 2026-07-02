# The new-tab extension

The extension in `extension/` makes your self-hosted hub open on every new
browser tab, embedded full screen. The hub is a website you host yourself; the
extension is just a thin wrapper around it.

## Install (Chrome, Edge, Brave)

1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select the `extension/` folder.
4. Click the extension icon (or open its options) and enter your hub URL, for
   example `https://hub.example.com`.
5. Open a new tab. Your hub appears.

## How it works

- `manifest.json` overrides the new-tab page with `newtab.html`.
- `newtab.js` reads the hub URL you saved and loads it in a full-screen iframe.
- `background.js` registers a single dynamic `declarativeNetRequest` rule that
  removes the `X-Frame-Options` and `Content-Security-Policy` response headers,
  but only for the sub-frame request to the exact host you configured. This is
  required because a hardened self-hosted hub sends
  `X-Frame-Options: DENY` and a `frame-ancestors 'none'` policy to prevent
  clickjacking, which would otherwise block the iframe.
- `options.html` and `options.js` store the hub URL in `chrome.storage.sync`.

The extension never contacts any third party and never changes your server. It
only relaxes framing headers for the one host you point it at, inside your own
browser.

## Permissions

- `storage` — to remember your hub URL.
- `declarativeNetRequest` with `host_permissions` — to strip the two framing
  headers from your hub's responses so the iframe can render.

## Firefox

Firefox supports Manifest V3 and `declarativeNetRequest`, but new-tab overrides
and dynamic header rules differ. The simplest cross-browser alternative is to
set your hub URL as your browser's home and new-tab page directly, or to use a
generic "custom new tab" extension pointed at your hub. Header stripping is only
needed for embedding; a full-page navigation to the hub needs no extension.

## Security note

Only point the extension at a hub you control and trust. Removing framing
headers for a host means any page from that host can be embedded in your new
tab. Since it is your own single-user hub, this is safe; do not repurpose the
rule for third-party sites.
