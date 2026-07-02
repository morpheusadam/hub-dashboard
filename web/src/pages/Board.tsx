import React, { useMemo, useState, useEffect } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useApp } from '../App'
import { Icon, Modal, ICON_NAMES, ICON_SET } from '../ui'
import { Link, iconUrl, uid, getSettings } from '../api'
import { WORDS } from '../words'
import { creativeGreeting } from '../greetings'

const AV = ['#a3e635', '#22d3ee', '#f472b6', '#c084fc', '#fb923c', '#38bdf8', '#4ade80', '#facc15', '#f87171', '#818cf8']
function avatarColor(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return AV[Math.abs(h) % AV.length] }
function host(u: string) { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
function ownerName() { try { return localStorage.getItem('hub_owner') || '' } catch { return '' } }

export default function BoardPage() {
  const { board, persist } = useApp()
  const links = useMemo<Link[]>(() => (board.lists || []).flatMap(l => l.links || []), [board])
  const [modal, setModal] = useState<{ link?: Link } | null>(null)
  const [greeting] = useState(() => creativeGreeting(ownerName()))

  // cache the owner name for the next visit's greeting (does not disturb this one)
  useEffect(() => { getSettings().then(s => { try { localStorage.setItem('hub_owner', s.owner || '') } catch {} }).catch(() => {}) }, [])

  function save(next: Link[]) { persist({ ...board, lists: [{ id: 'links', title: 'Links', icon: 'grid', links: next }] }) }
  function upsert(title: string, url: string, icon: string) {
    if (!title.trim() || !url.trim()) return
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    if (modal?.link) save(links.map(k => k.id === modal.link!.id ? { ...k, title, url, icon } : k))
    else save([...links, { id: 'k' + uid(), title, url, icon }])
    setModal(null)
  }
  function del(id: string) { save(links.filter(k => k.id !== id)) }
  function onDragEnd(e: any) {
    const { active, over } = e; if (!over || active.id === over.id) return
    save(arrayMove(links, links.findIndex(k => k.id === active.id), links.findIndex(k => k.id === over.id)))
  }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  return (
    <div className="wrap board">
      <div className="launch-head">
        <div><h1 className="greet">{greeting}</h1><WordOfDay /></div>
        <button className="btn primary" onClick={() => setModal({})}><Icon name="plus" size={16} /> Add app</button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={links.map(k => k.id)} strategy={rectSortingStrategy}>
          <div className="launch-grid">
            {links.map(k => <Tile key={k.id} link={k} onEdit={() => setModal({ link: k })} onDel={() => del(k.id)} />)}
            <button className="tile add" onClick={() => setModal({})}>
              <span className="t-badge add"><Icon name="plus" size={22} /></span><span className="t-name">Add</span>
            </button>
          </div>
        </SortableContext>
      </DndContext>

      {modal && <LinkModal init={modal.link} onClose={() => setModal(null)} onSave={upsert} />}
    </div>
  )
}

function WordOfDay() {
  const [off, setOff] = useState(() => { try { return parseInt(localStorage.getItem('wotd_off') || '0') || 0 } catch { return 0 } })
  const day = Math.floor(Date.now() / 86400000)
  const w = WORDS[((day + off) % WORDS.length + WORDS.length) % WORDS.length]
  function nextWord() { const n = off + 1; setOff(n); try { localStorage.setItem('wotd_off', String(n)) } catch {} }
  // warm up the voice list once (Chrome/Edge stay silent until getVoices() is populated)
  useEffect(() => {
    const s = window.speechSynthesis; if (!s) return
    s.getVoices(); const h = () => s.getVoices(); s.addEventListener?.('voiceschanged', h)
    return () => s.removeEventListener?.('voiceschanged', h)
  }, [])
  function speak(text: string) {
    try {
      const s = window.speechSynthesis
      if (!s) { alert('Speech is not supported in this browser'); return }
      s.cancel()
      const voices = s.getVoices()
      const en = voices.find(v => /^en([-_]|$)/i.test(v.lang))
      const run = () => {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-US'; u.rate = 0.9; u.pitch = 1; u.volume = 1
        if (en) u.voice = en
        s.resume(); s.speak(u)
      }
      // give cancel() a tick so Chrome doesn't drop the new utterance
      setTimeout(run, 60)
    } catch {}
  }
  return (
    <div className="wotd">
      <span className="wotd-label">Word of the day</span>
      <button className="wotd-speak" onClick={() => speak(w.en)} title="Pronounce"><Icon name="volume" size={14} /></button>
      <span className="wotd-en">{w.en}</span>
      <span className="wotd-fa">{w.fa}</span>
      <button className="wotd-next" onClick={nextWord} title="I know it — next word"><Icon name="refresh" size={13} /></button>
      <button className="wotd-ex-play" onClick={() => speak(w.en + '. ' + w.ex)} title="Play example"><Icon name="volume" size={11} /><span className="wotd-ex">{w.ex}</span></button>
    </div>
  )
}

function Tile({ link, onEdit, onDel }: { link: Link; onEdit: () => void; onDel: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id })
  const [imgFail, setImgFail] = useState(false)
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const named = link.icon && ICON_SET.has(link.icon)
  const h = host(link.url)
  return (
    <div ref={setNodeRef} style={style} className="tile" {...attributes} {...listeners}>
      <a className="t-open" href={link.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
        <span className="t-badge">
          {named ? <Icon name={link.icon!} size={26} />
            : (!imgFail ? <img src={iconUrl(link.url)} alt="" onError={() => setImgFail(true)} />
              : <span className="t-letter" style={{ background: avatarColor(h) }}>{(link.title || h)[0]?.toUpperCase()}</span>)}
        </span>
        <span className="t-name">{link.title}</span>
        <span className="t-host">{h}</span>
      </a>
      <div className="t-tools">
        <button className="icon-btn xs" onPointerDown={e => e.stopPropagation()} onClick={onEdit}><Icon name="edit" size={12} /></button>
        <button className="icon-btn xs danger" onPointerDown={e => e.stopPropagation()} onClick={onDel}><Icon name="trash" size={12} /></button>
      </div>
    </div>
  )
}

function LinkModal({ init, onClose, onSave }: { init?: Link; onClose: () => void; onSave: (t: string, u: string, i: string) => void }) {
  const [title, setTitle] = useState(init?.title || '')
  const [url, setUrl] = useState(init?.url || '')
  const [icon, setIcon] = useState(init?.icon || '')
  return (
    <Modal title={init ? 'Edit app' : 'Add app'} onClose={onClose}>
      <label className="fld">Name<input className="input" value={title} autoFocus onChange={e => setTitle(e.target.value)} /></label>
      <label className="fld">URL<input className="input" value={url} placeholder="https://…" onChange={e => setUrl(e.target.value)} /></label>
      <div className="fld">Icon
        <div className="icon-pick">
          <button className={'ip auto' + (icon === '' ? ' on' : '')} onClick={() => setIcon('')} title="Use website favicon"><Icon name="globe" size={15} /><span>Auto</span></button>
          {ICON_NAMES.map(ic => <button key={ic} className={'ip' + (ic === icon ? ' on' : '')} onClick={() => setIcon(ic)}><Icon name={ic} size={16} /></button>)}
        </div>
      </div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={() => onSave(title, url, icon)}>Save</button></div>
    </Modal>
  )
}
