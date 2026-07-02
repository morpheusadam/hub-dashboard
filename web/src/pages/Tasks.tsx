import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui'
import { useApp } from '../App'
import { uid } from '../api'

type Task = { id: string; text: string; done: boolean; due?: string; prio?: 'low' | 'med' | 'high' }

export default function TasksPage() {
  const { board, persist, toast } = useApp()
  const tasks: Task[] = (board.settings && board.settings.tasks) || []
  const [text, setText] = useState(''); const [due, setDue] = useState(''); const [prio, setPrio] = useState<'low' | 'med' | 'high'>('med')
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const notified = useRef<Set<string>>(new Set())

  function save(next: Task[]) { persist({ ...board, settings: { ...(board.settings || {}), tasks: next } }) }
  function add() { if (!text.trim()) return; save([{ id: uid(), text: text.trim(), done: false, due: due || undefined, prio }, ...tasks]); setText(''); setDue('') }
  function toggle(id: string) { save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)) }
  function del(id: string) { save(tasks.filter(t => t.id !== id)) }

  async function askPerm() {
    if (typeof Notification === 'undefined') { toast('Notifications unsupported', 'err'); return }
    const p = await Notification.requestPermission(); setPerm(p)
    if (p === 'granted') new Notification('Lavzen Hub', { body: 'Reminders enabled ✓' })
  }
  // reminder checker
  useEffect(() => {
    const iv = setInterval(() => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const now = Date.now()
      for (const t of tasks) {
        if (t.done || !t.due || notified.current.has(t.id)) continue
        if (new Date(t.due).getTime() <= now) { new Notification('Task due', { body: t.text }); notified.current.add(t.id) }
      }
    }, 20000)
    return () => clearInterval(iv)
  }, [tasks])

  const open = tasks.filter(t => !t.done), done = tasks.filter(t => t.done)
  const pc: Record<string, string> = { low: '#38bdf8', med: '#facc15', high: '#fb7185' }

  return (
    <div className="wrap">
      <div className="page-head"><h1>Tasks</h1><span className="muted">{open.length} open</span>
        {perm !== 'granted' && <button className="btn" onClick={askPerm}><Icon name="bell" size={15} /> Enable reminders</button>}
      </div>
      <div className="task-new glass">
        <input className="input" placeholder="Add a task…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <input className="input dt" type="datetime-local" value={due} onChange={e => setDue(e.target.value)} title="Reminder time (optional)" />
        <select className="input sel" value={prio} onChange={e => setPrio(e.target.value as any)}><option value="low">Low</option><option value="med">Med</option><option value="high">High</option></select>
        <button className="btn primary" onClick={add}><Icon name="plus" size={16} /></button>
      </div>

      <div className="task-list">
        {open.map(t => (
          <div key={t.id} className="task-item glass">
            <button className="chk" onClick={() => toggle(t.id)} aria-label="done" />
            <span className="prio" style={{ background: pc[t.prio || 'med'] }} />
            <span className="tk-text">{t.text}</span>
            {t.due && <span className="tk-due"><Icon name="bell" size={12} /> {new Date(t.due).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
            <button className="icon-btn xs danger" onClick={() => del(t.id)}><Icon name="trash" size={13} /></button>
          </div>
        ))}
        {!open.length && <div className="empty glass"><p>No open tasks. 🎉</p></div>}
        {done.length > 0 && <div className="done-label">Done ({done.length})</div>}
        {done.map(t => (
          <div key={t.id} className="task-item glass done">
            <button className="chk on" onClick={() => toggle(t.id)}><Icon name="check2" size={12} /></button>
            <span className="tk-text">{t.text}</span>
            <button className="icon-btn xs danger" onClick={() => del(t.id)}><Icon name="trash" size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
