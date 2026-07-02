import React, { useEffect, useState } from 'react'
import { Icon, Spinner } from '../ui'
import { getProjects, getTrending, Projects, Trending, TrendRepo } from '../api'

function ago(epochSec?: number | null): string {
  if (!epochSec) return '—'
  const d = Math.max(0, Math.floor(Date.now() / 1000) - epochSec)
  if (d < 60) return 'just now'
  if (d < 3600) return Math.floor(d / 60) + 'm ago'
  if (d < 86400) return Math.floor(d / 3600) + 'h ago'
  return Math.floor(d / 86400) + 'd ago'
}
function fmtStars(n?: number | null): string {
  if (n == null) return ''
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

function RepoCard({ r }: { r: TrendRepo }) {
  return (
    <a className="trend-card glass" href={r.url} target="_blank" rel="noreferrer">
      <div className="tc-top"><Icon name="github" size={14} /><span className="tc-name" dir="ltr">{r.name}</span></div>
      {r.desc ? <div className="tc-desc" dir="ltr">{r.desc}</div> : <div className="tc-desc dim">No description</div>}
      {r.fa && <div className="tc-fa" dir="rtl">{r.fa}</div>}
      <div className="tc-meta">
        {r.lang && <span className="tc-lang">{r.lang}</span>}
        {r.starsToday != null
          ? <span className="tc-star up"><Icon name="star" size={11} /> {r.starsToday.toLocaleString()} today</span>
          : (r.stars != null && <span className="tc-star"><Icon name="star" size={11} /> {fmtStars(r.stars)}</span>)}
      </div>
    </a>
  )
}

export default function TrendsPage() {
  const [proj, setProj] = useState<Projects | null>(null)
  const [tr, setTr] = useState<Trending | null>(null)
  const [tab, setTab] = useState<'trending' | 'ai'>('trending')
  useEffect(() => {
    getProjects().then(setProj).catch(() => setProj({ solova: null, repos: [], lavzenUpdated: null, generated: null }))
    getTrending().then(setTr).catch(() => setTr({ repos: [], ai: [] }))
  }, [])

  const s = proj?.solova
  const list = tab === 'ai' ? tr?.ai : tr?.repos

  return (
    <div className="wrap">
      <div className="page-head"><h1>Trends &amp; Projects</h1><span className="muted">Live from Solova, your repos and GitHub</span></div>

      <section className="tr-row">
        <div className="widget glass tr-solova">
          <div className="w-head"><span className="w-ic"><Icon name="briefcase" size={15} /></span><h3>Solova tasks</h3></div>
          {!proj && <div className="w-load"><Spinner /></div>}
          {proj && (
            <div className="tr-stats">
              <div className="tr-stat cyan"><b>{s?.started ?? 0}</b><span>Started</span></div>
              <div className="tr-stat orange"><b>{s?.notStarted ?? 0}</b><span>Not started</span></div>
              <div className="tr-stat lime"><b>{s?.done ?? 0}</b><span>Done</span></div>
              <div className="tr-stat"><b>{s?.total ?? 0}</b><span>Total</span></div>
            </div>
          )}
          {proj && !s && <div className="w-empty">Solova is unreachable right now.</div>}
        </div>

        <div className="widget glass tr-reposw">
          <div className="w-head"><span className="w-ic"><Icon name="github" size={15} /></span><h3>My repos</h3>
            <span className="w-more">latest {ago(proj?.lavzenUpdated)}</span></div>
          {!proj && <div className="w-load"><Spinner /></div>}
          <div className="tr-repos">
            {proj?.repos.map(r => (
              <div key={r.name} className="tr-repo">
                <div className="tr-repo-h"><Icon name="code" size={12} /><b dir="ltr">{r.name}</b><span className="tr-branch">{r.branch}</span><span className="tr-ago">{ago(r.updated)}</span></div>
                {r.subject && <div className="tr-repo-s">{r.subject}</div>}
              </div>
            ))}
            {proj && !proj.repos.length && <div className="w-empty">No repos found.</div>}
          </div>
        </div>
      </section>

      <div className="page-head sub"><h2>Trending on GitHub · today</h2></div>
      <div className="chips">
        <button className={'chip' + (tab === 'trending' ? ' on' : '')} onClick={() => setTab('trending')}><Icon name="rocket" size={13} /> All trending</button>
        <button className={'chip' + (tab === 'ai' ? ' on' : '')} onClick={() => setTab('ai')}><Icon name="bot" size={13} /> AI</button>
      </div>
      {!tr && <div className="pad"><Spinner /></div>}
      {tr && (
        <div className="trend-grid">
          {list?.map((r, i) => <RepoCard key={r.name + i} r={r} />)}
        </div>
      )}
      {tr && list && !list.length && <div className="empty glass"><p>No trending repos right now.</p></div>}
    </div>
  )
}
