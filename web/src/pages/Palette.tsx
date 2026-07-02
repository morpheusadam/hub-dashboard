import React, { useMemo, useState } from 'react'
import { Icon } from '../ui'
import { Board } from '../api'

type Item = { label: string; sub?: string; action: () => void; icon: string }

export default function CommandPalette({ board, onClose, onNav }:
  { board: Board; onClose: () => void; onNav: (p: string) => void }) {
  const [q, setQ] = useState('')
  const items = useMemo<Item[]>(() => {
    const nav: Item[] = [
      { label: 'Board', icon: 'grid', action: () => onNav('/') },
      { label: 'Notes', icon: 'notes', action: () => onNav('/notes') },
      { label: 'Backups', icon: 'database', action: () => onNav('/backups') },
      { label: 'System', icon: 'power', action: () => onNav('/system') },
    ]
    const links: Item[] = []
    for (const l of board.lists || [])
      for (const k of l.links || [])
        links.push({ label: k.title, sub: l.title + ' · ' + k.url, icon: 'external', action: () => { window.open(k.url, '_blank'); onClose() } })
    return [...nav, ...links]
  }, [board])
  const filtered = items.filter(i => (i.label + ' ' + (i.sub || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 40)
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="palette glass" onMouseDown={e => e.stopPropagation()}>
        <div className="palette-search">
          <Icon name="search" />
          <input autoFocus placeholder="Search links & pages…" value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && filtered[0]) filtered[0].action() }} />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list">
          {filtered.map((i, n) => (
            <button key={n} className="palette-item" onClick={i.action}>
              <Icon name={i.icon} size={16} />
              <span className="pi-label">{i.label}</span>
              {i.sub && <span className="pi-sub">{i.sub}</span>}
            </button>
          ))}
          {!filtered.length && <div className="palette-empty">No results</div>}
        </div>
      </div>
    </div>
  )
}
