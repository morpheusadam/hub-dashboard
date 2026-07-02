import React, { useEffect, useState } from 'react'
import { getSystem, setAutostart } from '../api'
import { useApp } from '../App'

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export default function SystemPage() {
  const { toast } = useApp()
  const [d, setD] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  function load() { getSystem().then(setD).catch(() => setD({ error: true })) }
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [])

  async function toggle() {
    if (!d || busy) return
    setBusy(true)
    const r = await setAutostart(!d.autostart)
    setBusy(false)
    if (r.data?.ok) { setD((x: any) => ({ ...x, autostart: r.data.autostart })); toast(r.data.autostart ? 'Autostart enabled' : 'Autostart disabled') }
    else toast('Error: ' + (r.data?.error || 'failed'), 'err')
  }
  const domains = d?.domains || []
  const up = domains.filter((x: any) => x.up).length

  return (
    <div className="wrap">
      <div className="page-head"><h1>System</h1>
        {d && !d.error && <span className={'pill ' + (d.autostart ? 'ok' : 'bad')}><span className="dot" />{d.autostart ? 'AUTOSTART ON' : 'AUTOSTART OFF'}</span>}
      </div>

      <div className="sys-card glass">
        <div>
          <h2>Auto-start on Windows boot</h2>
          <p className="muted">When on, WSL and the Cloudflare tunnel start automatically on every Windows boot, keeping all domains reachable. Turning it off only stops the next auto-launch.</p>
          <div className="sys-state">{d ? (d.autostart ? 'On' : 'Off') : '…'}</div>
        </div>
        <button className={'switch' + (d?.autostart ? ' on' : '') + (busy || !d ? ' busy' : '')} onClick={toggle} aria-label="toggle"><span className="knob" /></button>
      </div>

      <div className="page-head sub"><h2>Domains · Cloudflare tunnel</h2>{d && <span className="pill">{up}/{domains.length} up</span>}</div>
      <div className="cards-grid tight">
        {domains.map((x: any) => (
          <div key={x.sub} className={'dom-card glass ' + (x.up ? 'up' : 'down')}>
            <div><div className="dc-name">{cap(x.sub)}</div><div className="dc-url">{x.host || x.sub}</div></div>
            <div className="dc-stat"><span className={'dot2 ' + (x.up ? 'up' : 'down')} /><span className="code">{x.code ? 'HTTP ' + x.code : '—'}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
