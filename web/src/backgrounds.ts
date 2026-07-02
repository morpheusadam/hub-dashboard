// Wallpaper rotation. Loads the wallpaper list configured in Settings
// (api/wallpapers.php) and rotates to a random one every 2 hours (persisted).
// Falls back to premium CSS gradients when no wallpapers are configured.

export type Wall = { url?: string; css?: string; label: string }
type Item = { cat: string; url: string }

const KEY = 'hub_bg'
const TWO_HOURS = 2 * 60 * 60 * 1000
let ITEMS: Item[] = []

const CAT_LABEL: Record<string, string> = { custom: 'Custom' }

// Professional dark backgrounds: a dark tinted base with one clear, coloured
// light source. Kept tasteful, but each is visibly distinct so shuffling shows
// an obvious change.
const FALLBACK: Wall[] = [
  { label: 'Indigo', css: 'radial-gradient(1300px 900px at 78% -12%, rgba(99,102,241,.42), transparent 62%),radial-gradient(900px 700px at 8% 108%, rgba(56,189,248,.16), transparent 60%),linear-gradient(180deg,#0b0d1c,#070810)' },
  { label: 'Emerald', css: 'radial-gradient(1300px 900px at 82% -10%, rgba(16,185,129,.40), transparent 62%),radial-gradient(900px 700px at 10% 110%, rgba(163,230,53,.14), transparent 60%),linear-gradient(180deg,#07130f,#060b09)' },
  { label: 'Violet', css: 'radial-gradient(1300px 900px at 20% -10%, rgba(168,85,247,.42), transparent 62%),radial-gradient(900px 720px at 95% 100%, rgba(236,72,153,.16), transparent 60%),linear-gradient(180deg,#120a1c,#0a0710)' },
  { label: 'Ocean', css: 'radial-gradient(1300px 900px at 15% -10%, rgba(14,165,233,.40), transparent 62%),radial-gradient(900px 700px at 90% 108%, rgba(45,212,191,.18), transparent 60%),linear-gradient(180deg,#07121b,#050b12)' },
  { label: 'Amber', css: 'radial-gradient(1300px 900px at 80% -12%, rgba(245,158,11,.36), transparent 60%),radial-gradient(900px 720px at 6% 106%, rgba(239,68,68,.16), transparent 60%),linear-gradient(180deg,#161009,#0c0806)' },
  { label: 'Rose', css: 'radial-gradient(1300px 900px at 22% -10%, rgba(244,63,94,.38), transparent 62%),radial-gradient(900px 700px at 92% 104%, rgba(168,85,247,.16), transparent 60%),linear-gradient(180deg,#170a11,#0d070b)' },
  { label: 'Slate', css: 'radial-gradient(1300px 940px at 50% -14%, rgba(148,163,184,.22), transparent 60%),radial-gradient(900px 700px at 85% 108%, rgba(99,102,241,.16), transparent 60%),linear-gradient(180deg,#0e1117,#080a0e)' },
  { label: 'Teal', css: 'radial-gradient(1300px 900px at 84% -10%, rgba(20,184,166,.40), transparent 62%),radial-gradient(900px 720px at 10% 106%, rgba(59,130,246,.16), transparent 60%),linear-gradient(180deg,#08130f,#060c0c)' },
]

export async function loadWallpapers(): Promise<number> {
  try {
    const r = await fetch('/api/wallpapers.php', { credentials: 'same-origin' })
    const j = await r.json()
    ITEMS = Array.isArray(j?.items) ? j.items : []
  } catch { ITEMS = [] }
  return ITEMS.length
}

function toWall(it: Item): Wall { return { url: it.url, label: CAT_LABEL[it.cat] || it.cat } }

// The active pool is the user's custom images if any, otherwise the built-in
// minimal gradients. Both are handled uniformly and keyed by url-or-label so a
// manual shuffle persists and survives the periodic auto-refresh.
function pool(): Wall[] { return ITEMS.length ? ITEMS.map(toWall) : FALLBACK }
function keyOf(w: Wall): string { return w.url || w.label }

function readSel(): { key: string; ts: number } | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
function writeSel(w: Wall, now: number) {
  try { localStorage.setItem(KEY, JSON.stringify({ key: keyOf(w), ts: now })) } catch {}
}

export function currentBg(now: number): Wall {
  const p = pool()
  const s = readSel()
  const found = s ? p.find(w => keyOf(w) === s.key) : undefined
  if (found && now - s!.ts <= TWO_HOURS) return found
  // pick a fresh one, seeded by the two-hour bucket so reloads stay stable
  const w = p[Math.floor(now / TWO_HOURS) % p.length]
  writeSel(w, now)
  return w
}

export function shuffleBg(now: number): Wall {
  const p = pool()
  const curKey = readSel()?.key || ''
  let w = p[Math.floor(Math.random() * p.length)]
  for (let i = 0; p.length > 1 && keyOf(w) === curKey && i < 12; i++) {
    w = p[Math.floor(Math.random() * p.length)]
  }
  writeSel(w, now)
  return w
}

export function bgStyle(w: Wall): React.CSSProperties {
  return w.url
    ? { backgroundImage: `url("${w.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: w.css }
}
