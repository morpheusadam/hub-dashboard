import React, { useEffect, useState } from 'react'
import { Icon, Spinner } from '../ui'
import { getSettings, saveSettings, Settings } from '../api'
import { useApp } from '../App'

export default function SettingsPage() {
  const { toast } = useApp()
  const [s, setS] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')

  useEffect(() => { getSettings().then(setS).catch(() => toast('Failed to load settings', 'err')) }, [])

  function patch(p: Partial<Settings>) { setS(v => (v ? { ...v, ...p } as Settings : v)) }

  async function save() {
    if (!s) return
    setBusy(true)
    const body: any = {
      owner: s.owner, weather: s.weather, youtube: s.youtube, tweets: s.tweets,
      services: s.services, wallpapers: s.wallpapers, trends: s.trends,
      github: { username: s.github.username, token: s.github.token || '' },
    }
    const r = await saveSettings(body)
    setBusy(false)
    if (r.data?.ok) {
      try { localStorage.setItem('hub_owner', s.owner || '') } catch {}
      toast('Settings saved')
      if (s.github.token) setS(v => (v ? { ...v, github: { ...v.github, token: '' }, _hasGithubToken: true } : v))
    } else toast(r.data?.error || 'Save failed', 'err')
  }

  async function changePassword() {
    if (newPw.length < 8) { toast('New password must be at least 8 characters', 'err'); return }
    setBusy(true)
    const r = await saveSettings({ currentPassword: curPw, newPassword: newPw })
    setBusy(false)
    if (r.data?.ok) { toast('Password changed'); setCurPw(''); setNewPw('') }
    else toast(r.data?.error || 'Failed', 'err')
  }

  if (!s) return <div className="wrap"><div className="pad"><Spinner /></div></div>

  return (
    <div className="wrap">
      <div className="page-head"><h1>Settings</h1><span className="muted">Saved to data/settings.json</span></div>
      <div className="settings">

        <section className="set-card glass">
          <h2><Icon name="home" size={16} /> Profile</h2>
          <p className="muted sm">Optional name shown in the home-screen greeting. Leave empty for none.</p>
          <input className="input" value={s.owner || ''} placeholder="Your name"
            onChange={e => patch({ owner: e.target.value })} />
        </section>

        <section className="set-card glass">
          <h2><Icon name="cloud" size={16} /> Weather</h2>
          <p className="muted sm">Locations for the Weather widget (Open-Meteo, no key).</p>
          {s.weather.locations.map((l, i) => (
            <div className="set-row3" key={i}>
              <input className="input" value={l.name} placeholder="City"
                onChange={e => { const n = [...s.weather.locations]; n[i] = { ...l, name: e.target.value }; patch({ weather: { locations: n } }) }} />
              <input className="input" value={l.lat} placeholder="lat"
                onChange={e => { const n = [...s.weather.locations]; n[i] = { ...l, lat: parseFloat(e.target.value) || 0 }; patch({ weather: { locations: n } }) }} />
              <input className="input" value={l.lon} placeholder="lon"
                onChange={e => { const n = [...s.weather.locations]; n[i] = { ...l, lon: parseFloat(e.target.value) || 0 }; patch({ weather: { locations: n } }) }} />
              <button className="icon-btn danger" title="Remove"
                onClick={() => patch({ weather: { locations: s.weather.locations.filter((_, j) => j !== i) } })}><Icon name="trash" size={14} /></button>
            </div>
          ))}
          <button className="btn sm" onClick={() => patch({ weather: { locations: [...s.weather.locations, { name: '', lat: 0, lon: 0 }] } })}><Icon name="plus" size={14} /> Add location</button>
        </section>

        <section className="set-card glass">
          <h2><Icon name="play" size={16} /> YouTube channels</h2>
          <p className="muted sm">One channel ID (UC...) or @handle per line. Powers the "top of the week" widget.</p>
          <textarea className="input mono" rows={6} value={(s.youtube.channels || []).join('\n')}
            onChange={e => patch({ youtube: { channels: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) } })} />
        </section>

        <section className="set-card glass">
          <h2><Icon name="message" size={16} /> Trending tweet</h2>
          <p className="muted sm">A public Telegram channel to mirror the top post from. Leave empty to hide the widget.</p>
          <input className="input" value={s.tweets.telegramChannel} placeholder="e.g. durov"
            onChange={e => patch({ tweets: { telegramChannel: e.target.value.trim() } })} />
        </section>

        <section className="set-card glass">
          <h2><Icon name="power" size={16} /> Services health</h2>
          <p className="muted sm">Optional base domain, then one subdomain per line. Each is health-checked on the System page (base "example.com" + "app" checks https://app.example.com). Full hostnames also work when the base is empty.</p>
          <input className="input" value={s.services.baseDomain} placeholder="example.com (optional)"
            onChange={e => patch({ services: { ...s.services, baseDomain: e.target.value.trim() } })} />
          <textarea className="input mono" rows={4} value={(s.services.domains || []).join('\n')}
            onChange={e => patch({ services: { ...s.services, domains: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) } })} />
        </section>

        <section className="set-card glass">
          <h2><Icon name="image" size={16} /> Wallpapers</h2>
          <p className="muted sm">One background image URL per line, rotated every 2 hours. Leave empty to use the built-in gradients.</p>
          <textarea className="input mono" rows={4} value={(s.wallpapers?.images || []).join('\n')}
            onChange={e => patch({ wallpapers: { images: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) } })} />
        </section>

        <section className="set-card glass">
          <h2><Icon name="rocket" size={16} /> Trends</h2>
          <p className="muted sm">Language code for the auto one-line summaries on the Trends page (e.g. "fa", "es", "de"). Use "en" to keep the original text and skip translation.</p>
          <input className="input" value={s.trends.translateTo} placeholder="en"
            onChange={e => patch({ trends: { translateTo: e.target.value.trim() } })} />
        </section>

        <section className="set-card glass">
          <h2><Icon name="github" size={16} /> GitHub (optional)</h2>
          <p className="muted sm">A fine-grained, read-only token enables the account repository list. Stored only in your data/settings.json, never returned to the browser.</p>
          <input className="input" value={s.github.username} placeholder="github username"
            onChange={e => patch({ github: { ...s.github, username: e.target.value.trim() } })} />
          <input className="input" type="password" value={s.github.token}
            placeholder={s._hasGithubToken ? 'saved — leave blank to keep' : 'github token'}
            onChange={e => patch({ github: { ...s.github, token: e.target.value } })} />
        </section>

        <div className="set-actions">
          <button className="btn primary" disabled={busy} onClick={save}><Icon name="check2" size={15} /> Save settings</button>
        </div>

        <section className="set-card glass">
          <h2><Icon name="key" size={16} /> Change password</h2>
          <div className="set-row2">
            <input className="input" type="password" value={curPw} placeholder="Current password" onChange={e => setCurPw(e.target.value)} />
            <input className="input" type="password" value={newPw} placeholder="New password (min 8)" onChange={e => setNewPw(e.target.value)} />
            <button className="btn" disabled={busy || !curPw || !newPw} onClick={changePassword}>Update</button>
          </div>
        </section>

      </div>
    </div>
  )
}
