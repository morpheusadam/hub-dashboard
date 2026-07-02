import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui'
import { getNotes, saveNotes, Note, uid } from '../api'
import { useApp } from '../App'

export default function NotesPage() {
  const { toast } = useApp()
  const [notes, setNotes] = useState<Note[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const saveRef = useRef<any>(null)

  useEffect(() => { getNotes().then(n => { setNotes(n); setSel(n[0]?.id || null); setLoading(false) }) }, [])

  function persist(next: Note[]) {
    setNotes(next); clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => saveNotes(next).catch(() => toast('Save failed', 'err')), 600)
  }
  function add() {
    const n: Note = { id: uid(), title: 'Untitled', body: '', updated: Math.floor(Date.now() / 1000) }
    const next = [n, ...notes]; persist(next); setSel(n.id)
  }
  function edit(id: string, patch: Partial<Note>) {
    persist(notes.map(n => n.id === id ? { ...n, ...patch, updated: Math.floor(Date.now() / 1000) } : n))
  }
  function del(id: string) {
    if (!confirm('Delete this note?')) return
    const next = notes.filter(n => n.id !== id); persist(next); if (sel === id) setSel(next[0]?.id || null)
  }
  const cur = notes.find(n => n.id === sel) || null

  return (
    <div className="wrap">
      <div className="notes-layout">
        <aside className="notes-list glass">
          <div className="nl-head"><h3>Notes</h3><button className="icon-btn sm" onClick={add}><Icon name="plus" size={16} /></button></div>
          {loading && <div className="muted pad">…</div>}
          {!loading && !notes.length && <div className="muted pad">No notes yet</div>}
          {notes.map(n => (
            <button key={n.id} className={'nl-item' + (n.id === sel ? ' on' : '')} onClick={() => setSel(n.id)}>
              <b>{n.title || 'Untitled'}</b>
              <span>{n.body.slice(0, 46) || '—'}</span>
            </button>
          ))}
        </aside>
        <section className="note-edit glass">
          {cur ? (
            <>
              <div className="ne-top">
                <input className="ne-title" value={cur.title} placeholder="Title"
                  onChange={e => edit(cur.id, { title: e.target.value })} />
                <button className="icon-btn sm danger" onClick={() => del(cur.id)}><Icon name="trash" size={15} /></button>
              </div>
              <textarea className="ne-body" value={cur.body} placeholder="Write…"
                onChange={e => edit(cur.id, { body: e.target.value })} />
            </>
          ) : <div className="empty-mini">Select or create a note</div>}
        </section>
      </div>
    </div>
  )
}
