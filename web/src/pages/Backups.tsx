import React, { useEffect, useState } from 'react'
import { Icon } from '../ui'
import { getStatus } from '../api'

function rel(ts: number) {
  const d = Math.max(0, Date.now() / 1000 - ts)
  if (d < 60) return Math.floor(d) + 's'
  if (d < 3600) return Math.floor(d / 60) + 'm'
  if (d < 86400) return Math.floor(d / 3600) + 'h'
  return Math.floor(d / 86400) + 'd'
}
const META: Record<string, string> = {
  vaultwarden: 'Vaultwarden · passwords', snappymail: 'SnappyMail · webmail',
  'plane-db': 'Plane · PostgreSQL', 'plane-minio': 'Plane · files',
  'twenty-db': 'Twenty · PostgreSQL', 'nocobase-db': 'NocoBase · PostgreSQL',
}

export default function BackupsPage() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState(false)
  useEffect(() => { getStatus().then(x => { if (x?.status) setD(x); else setErr(true) }).catch(() => setErr(true)) }, [])

  const s = d?.status
  const services = s?.services ? Object.entries(s.services) as [string, any][] : []
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Backups</h1>
        {s && <span className={'pill ' + (s.overall === 'ok' ? 'ok' : 'bad')}><span className="dot" />{String(s.overall || '').toUpperCase()}</span>}
        <span className="muted">daily 03:00 · keeps 3</span>
      </div>
      {err && <div className="empty glass"><p>Backup report unavailable.</p></div>}
      {!d && !err && <div className="muted pad">…</div>}

      <div className="cards-grid">
        {services.map(([k, v]) => (
          <div key={k} className="stat-card glass">
            <div className="sc-top">
              <div><div className="sc-name">{k}</div><div className="sc-desc">{META[k] || 'service'}</div></div>
              <span className={'badge ' + (v.status === 'ok' ? 'ok' : 'bad')}>{v.status === 'ok' ? 'OK' : 'FAIL'}</span>
            </div>
            <ul className="baks">
              {(v.backups || []).slice(0, 3).map((b: any, i: number) => (
                <li key={i} className={i === 0 ? 'new' : ''}>
                  <span className="fn">{b.file}</span><span className="sz">{b.size}</span><span className="tm">{rel(b.mtime)}</span>
                </li>
              ))}
              {!(v.backups || []).length && <li className="none">no backups</li>}
            </ul>
            <div className="sc-foot">{v.count || 0} stored</div>
          </div>
        ))}
      </div>

      {d?.log && (
        <div className="logwrap glass">
          <h2>Backup log</h2>
          <pre>{d.log}</pre>
        </div>
      )}
    </div>
  )
}
