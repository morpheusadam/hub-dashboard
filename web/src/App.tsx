import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Icon, Spinner } from './ui'
import { loadWallpapers, currentBg, shuffleBg, bgStyle, Wall } from './backgrounds'
import { authCheck, login, logout, pushGit, getBoard, saveBoard, Board } from './api'
import BoardPage from './pages/Board'
import FeedPage from './pages/Feed'
import NotesPage from './pages/Notes'
import BackupsPage from './pages/Backups'
import SystemPage from './pages/System'
import NewsPage from './pages/News'
import TasksPage from './pages/Tasks'
import TrendsPage from './pages/Trends'
import GuidesPage from './pages/Guides'
import SettingsPage from './pages/Settings'
import CommandPalette from './pages/Palette'

type Ctx = {
  board: Board; setBoard: (b: Board) => void; persist: (b: Board) => void
  toast: (msg: string, kind?: 'ok' | 'err') => void
}
export const AppCtx = createContext<Ctx>(null as any)
export const useApp = () => useContext(AppCtx)

const NAV = [
  { to: '/', label: 'Board', icon: 'grid', end: true },
  { to: '/feed', label: 'Feed', icon: 'layers' },
  { to: '/news', label: 'News', icon: 'news' },
  { to: '/trends', label: 'Trends', icon: 'rocket' },
  { to: '/tasks', label: 'Tasks', icon: 'check2' },
  { to: '/notes', label: 'Notes', icon: 'notes' },
  { to: '/backups', label: 'Backups', icon: 'database' },
  { to: '/system', label: 'System', icon: 'power' },
  { to: '/guides', label: 'Guides', icon: 'book' },
]

export default function App() {
  // Optimistic auth: returning users (persistent cookie) render instantly; verify in the background.
  const [authed, setAuthed] = useState<boolean | null>(() => {
    try { return localStorage.getItem('lh_authed') === '1' ? true : null } catch { return null }
  })
  useEffect(() => {
    authCheck().then(ok => { setAuthed(ok); try { localStorage.setItem('lh_authed', ok ? '1' : '0') } catch {} })
  }, [])
  if (authed === null) return <div className="splash"><Spinner big /></div>
  if (!authed) return <Login onOk={() => { try { localStorage.setItem('lh_authed', '1') } catch {} setAuthed(true) }} />
  return <Shell />
}

function Login({ onOk }: { onOk: () => void }) {
  const [pw, setPw] = useState(''); const [remember, setRemember] = useState(true)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [bg, setBg] = useState<Wall>({ css: 'linear-gradient(180deg,#0b0d12,#07080b)', label: '' })
  useEffect(() => { loadWallpapers().then(() => setBg(currentBg(Date.now()))) }, [])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('')
    const r = await login(pw, remember); setBusy(false)
    if (r.data?.ok) onOk(); else setErr('Incorrect password')
  }
  return (
    <div className="auth-wrap" style={bgStyle(bg)}>
      <div className="auth-veil" />
      <form className="auth-card glass" onSubmit={submit}>
        <div className="auth-logo">H</div>
        <h1>Lavzen Hub</h1>
        <p className="muted">Sign in to continue</p>
        <input className="input" type="password" placeholder="Password" value={pw} autoFocus onChange={e => setPw(e.target.value)} />
        <label className="row-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
        {err && <div className="auth-err">{err}</div>}
        <button className="btn primary lg" disabled={busy || !pw}>{busy ? '…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

function Shell() {
  const [board, setBoardState] = useState<Board>(() => {
    try { return JSON.parse(localStorage.getItem('lh_board') || 'null') || { lists: [], timers: [], settings: {} } }
    catch { return { lists: [], timers: [], settings: {} } }
  })
  const [bg, setBg] = useState<Wall>({ css: 'linear-gradient(180deg,#0b0d12,#07080b)', label: '' })
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: string } | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const tRef = useRef<any>(null)
  const nav = useNavigate()

  useEffect(() => { getBoard().then(b => { const bb = b || { lists: [] }; setBoardState(bb); try { localStorage.setItem('lh_board', JSON.stringify(bb)) } catch {} }) }, [])
  useEffect(() => { loadWallpapers().then(() => setBg(currentBg(Date.now()))) }, [])
  useEffect(() => { const iv = setInterval(() => setBg(currentBg(Date.now())), 5 * 60 * 1000); return () => clearInterval(iv) }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true) } }
    addEventListener('keydown', h); return () => removeEventListener('keydown', h)
  }, [])

  const toast = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToastMsg({ msg, kind }); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToastMsg(null), 3200)
  }
  const persist = (b: Board) => { setBoardState(b); try { localStorage.setItem('lh_board', JSON.stringify(b)) } catch {} saveBoard(b).catch(() => toast('Save failed', 'err')) }
  const ctx: Ctx = { board, setBoard: setBoardState, persist, toast }

  async function doPush() { toast('Pushing…'); const r = await pushGit(); toast(r.data?.message || (r.data?.ok ? 'Pushed' : 'Push failed'), r.data?.ok ? 'ok' : 'err') }
  function fs() { const d: any = document; if (!d.fullscreenElement) d.documentElement.requestFullscreen?.(); else d.exitFullscreen?.() }
  async function signout() { try { localStorage.removeItem('lh_authed'); localStorage.removeItem('lh_board') } catch {} await logout(); location.reload() }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="appbg" style={bgStyle(bg)} />
      <div className="appbg-veil" />

      <main className="page">
        <Routes>
          <Route path="/" element={<BoardPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/backups" element={<BackupsPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<BoardPage />} />
        </Routes>
      </main>

      <FloatingMenu
        bgLabel={bg.label}
        onSearch={() => setPaletteOpen(true)}
        onShuffle={() => setBg(shuffleBg(Date.now()))}
        onFullscreen={fs}
        onPush={doPush}
        onSignout={signout}
      />

      {paletteOpen && <CommandPalette board={board} onClose={() => setPaletteOpen(false)} onNav={p => { nav(p); setPaletteOpen(false) }} />}
      {toastMsg && <div className={'toast show ' + toastMsg.kind}>{toastMsg.msg}</div>}
    </AppCtx.Provider>
  )
}

function FloatingMenu({ bgLabel, onSearch, onShuffle, onFullscreen, onPush, onSignout }: {
  bgLabel: string
  onSearch: () => void; onShuffle: () => void; onFullscreen: () => void; onPush: () => void; onSignout: () => void
}) {
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [y, setY] = useState<number>(() => {
    try { const v = parseInt(localStorage.getItem('hub_fabY') || ''); if (v) return v } catch {}
    return Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) / 2)
  })
  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null)

  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { startY: e.clientY, startTop: y, moved: false }
  }
  function move(e: React.PointerEvent) {
    const d = drag.current; if (!d) return
    const dy = e.clientY - d.startY
    if (Math.abs(dy) > 5) d.moved = true
    if (d.moved) setY(Math.min(window.innerHeight - 44, Math.max(44, d.startTop + dy)))
  }
  function up() {
    const d = drag.current; drag.current = null
    if (!d) return
    if (d.moved) { try { localStorage.setItem('hub_fabY', String(y)) } catch {} }
    else setOpen(o => !o)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    addEventListener('keydown', h); return () => removeEventListener('keydown', h)
  }, [])

  function go(to: string) { nav(to); setOpen(false) }

  return (
    <>
      <button
        className={'fab' + (open ? ' active' : '')}
        aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
        style={{ top: y }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up}
      >
        <span className="fab-grip" aria-hidden />
        <Icon name={open ? 'x' : 'menu'} size={20} />
      </button>

      {open && <div className="menu-scrim" onClick={() => setOpen(false)} />}

      <aside className={'menu-sheet glass' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="ms-head">
          <span className="ms-brand">Lavzen Hub</span>
          <LocalClock />
        </div>
        <nav className="ms-nav">
          {NAV.map(n => {
            const active = n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)
            return (
              <button key={n.to} className={'ms-item' + (active ? ' active' : '')} onClick={() => go(n.to)}>
                <Icon name={n.icon} size={18} /><span>{n.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="ms-div" />
        <div className="ms-actions">
          <button className="ms-item" onClick={() => { onSearch(); setOpen(false) }}><Icon name="search" size={18} /><span>Search</span><kbd>⌘K</kbd></button>
          <button className="ms-item" onClick={onShuffle}><Icon name="shuffle" size={18} /><span>Wallpaper</span>{bgLabel && <em>{bgLabel}</em>}</button>
          <button className="ms-item" onClick={() => go('/settings')}><Icon name="wrench" size={18} /><span>Settings</span></button>
          <button className="ms-item" onClick={onFullscreen}><Icon name="expand" size={18} /><span>Fullscreen</span></button>
          <a className="ms-item" href="/api/backup.php"><Icon name="download" size={18} /><span>Download backup</span></a>
          <button className="ms-item" onClick={() => { onPush(); setOpen(false) }}><Icon name="github" size={18} /><span>Push to Git</span></button>
          <button className="ms-item danger" onClick={() => { setOpen(false); onSignout() }}><Icon name="logout" size={18} /><span>Sign out</span></button>
        </div>
      </aside>
    </>
  )
}

function LocalClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const iv = setInterval(() => setT(new Date()), 1000); return () => clearInterval(iv) }, [])
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(t)
  const date = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'short' }).format(t)
  return <div className="lclock"><div className="lc-time">{time}</div><div className="lc-date">{date}</div></div>
}
