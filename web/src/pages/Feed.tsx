import React, { useState, useEffect } from 'react'
import { Link as RLink } from 'react-router-dom'
import { useApp } from '../App'
import { Icon } from '../ui'
import {
  imgProxy,
  getNews, getWeather, getSystem, getStatus, getYT, getTweet, getProjects, getTrending,
  NewsItem, YTVideo, Tweet, Projects, Trending, WeatherLoc,
} from '../api'

function fmt(n: number) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0) }
function wx(code: number | null): string {
  if (code == null) return '·'
  if (code === 0) return '☀️'; if (code <= 3) return '⛅'; if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'; if (code <= 77) return '❄️'; if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'; return '⛈️'
}

export default function FeedPage() {
  const { board } = useApp()
  const tasks: any[] = (board.settings && board.settings.tasks) || []

  const [news, setNews] = useState<NewsItem[] | null>(null)
  const [weather, setWeather] = useState<any>(null)
  const [sys, setSys] = useState<any>(null)
  const [bk, setBk] = useState<any>(null)
  const [yt, setYt] = useState<YTVideo[] | null>(null)
  const [tw, setTw] = useState<Tweet | null>(null)
  const [proj, setProj] = useState<Projects | null>(null)
  const [trend, setTrend] = useState<Trending | null>(null)
  useEffect(() => {
    getNews('tech').then(setNews).catch(() => setNews([]))
    getWeather().then(setWeather).catch(() => {})
    getSystem().then(setSys).catch(() => {})
    getStatus().then(d => setBk(d?.status)).catch(() => {})
    getYT().then(setYt).catch(() => setYt([]))
    getTweet().then(setTw).catch(() => setTw(null))
    getProjects().then(setProj).catch(() => {})
    getTrending().then(setTrend).catch(() => {})
  }, [])
  const openTasks = tasks.filter(t => !t.done)
  const nextTask = openTasks.filter(t => t.due).sort((a, b) => +new Date(a.due) - +new Date(b.due))[0]
  const domUp = sys?.domains ? sys.domains.filter((d: any) => d.up).length : null
  const domTot = sys?.domains?.length || 0
  const wxList: WeatherLoc[] = Array.isArray(weather) ? weather : []
  const ytTop = yt && yt[0]

  return (
    <div className="wrap">
      <div className="page-head"><h1>Feed</h1><span className="muted">News, media and your services at a glance</span></div>

      <section className="bw-top">
        <div className="widget w-news glass">
          <div className="w-head"><span className="w-ic"><Icon name="news" size={15} /></span><h3>Latest tech</h3><RLink className="w-more" to="/news">All →</RLink></div>
          {!news && <div className="w-load"><span className="spinner" /></div>}
          {news && news[0] && (
            <a className="news-hero" href={news[0].url} target="_blank" rel="noreferrer">
              {news[0].image && <img className="nh-img" src={imgProxy(news[0].image)} alt="" loading="lazy" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />}
              <div className="nh-title">{news[0].title}</div>
              <div className="nh-meta"><span>{news[0].source}</span><span><Icon name="zap" size={11} /> {news[0].points ?? 0}</span><span>{news[0].age}</span></div>
            </a>
          )}
          <div className="news-mini">
            {news?.slice(1, 4).map((n, i) => (
              <a key={i} className="nm-item" href={n.url} target="_blank" rel="noreferrer">
                {n.image
                  ? <img className="nm-thumb" src={imgProxy(n.image)} alt="" loading="lazy" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
                  : <span className="nm-dot" />}
                <span className="nm-txt">{n.title}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="widget w-yt glass">
          <div className="w-head"><span className="w-ic yt"><Icon name="play" size={14} /></span><h3>Tech · top week</h3></div>
          {!yt && <div className="w-load"><span className="spinner" /></div>}
          {ytTop && (
            <a className="yt-hero" href={ytTop.url} target="_blank" rel="noreferrer">
              <div className="yt-thumb"><img src={imgProxy(ytTop.thumb)} alt="" loading="lazy" /><span className="yt-play"><Icon name="play" size={16} /></span></div>
              <div className="yt-htitle" dir="auto">{ytTop.title}</div>
              <div className="yt-meta"><span>{ytTop.channel}</span><span><Icon name="zap" size={11} /> {fmt(ytTop.views)} views</span></div>
            </a>
          )}
          <div className="yt-mini">
            {yt?.slice(1, 3).map((v, i) => (
              <a key={i} className="ytm" href={v.url} target="_blank" rel="noreferrer">
                <img src={imgProxy(v.thumb)} alt="" loading="lazy" />
                <div className="ytm-b"><div className="ytm-t" dir="auto">{v.title}</div><div className="ytm-v">{fmt(v.views)} views</div></div>
              </a>
            ))}
          </div>
          {yt && !yt.length && <div className="w-empty">No recent videos.</div>}
        </div>

        <div className="widget w-tweet glass">
          <div className="w-head"><span className="w-ic tw"><Icon name="message" size={14} /></span><h3>Trending post</h3></div>
          {!tw && <div className="w-load"><span className="spinner" /></div>}
          {tw && tw.text !== undefined && (
            <a className="tw-card" href={tw.url} target="_blank" rel="noreferrer">
              {tw.image && <img className="tw-img" src={imgProxy(tw.image)} alt="" loading="lazy" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />}
              <p className="tw-text" dir="auto">{tw.text}</p>
              <div className="tw-meta"><Icon name="zap" size={11} /> {fmt(tw.views)} views</div>
            </a>
          )}
          {tw && (tw as any).error && <div className="w-empty">Not configured.</div>}
        </div>
      </section>

      <section className="bw-bottom">
        <div className="widget w-weather glass">
          <div className="w-head"><span className="w-ic"><Icon name="cloud" size={15} /></span><h3>Weather</h3></div>
          <div className="wx-row">
            {wxList.slice(0, 3).map((c, i) => (
              <div key={i} className="wx"><div className="wx-emoji">{wx(c.code)}</div><div className="wx-t">{c.temp != null ? c.temp + '°' : '—'}</div><div className="wx-c">{c.name}</div></div>
            ))}
            {!wxList.length && <div className="wx"><div className="wx-emoji">·</div><div className="wx-t">—</div><div className="wx-c">Weather</div></div>}
          </div>
        </div>
        <RLink className="widget w-svc glass" to="/system">
          <div className="w-head"><span className="w-ic"><Icon name="power" size={15} /></span><h3>Services</h3></div>
          <div className="svc-big"><b className={domUp != null && domUp === domTot ? 'ok' : 'warn'}>{domUp != null ? domUp : '–'}</b><span>/ {domTot || '–'} up</span></div>
          <div className="svc-dots">{(sys?.domains || []).map((d: any) => <span key={d.sub} className={'sdot ' + (d.up ? 'up' : 'down')} title={d.sub} />)}</div>
        </RLink>
        <RLink className="widget w-tasks glass" to="/tasks">
          <div className="w-head"><span className="w-ic"><Icon name="check2" size={15} /></span><h3>Tasks</h3></div>
          <div className="svc-big"><b>{openTasks.length}</b><span>open</span></div>
          <div className="tk-next">{nextTask ? <>Next: {nextTask.text.slice(0, 30)}</> : 'Nothing due'}</div>
        </RLink>
        <RLink className="widget w-bk glass" to="/backups">
          <div className="w-head"><span className="w-ic"><Icon name="database" size={15} /></span><h3>Backups</h3></div>
          <div className={'bk-pill ' + (bk?.overall === 'ok' ? 'ok' : bk ? 'bad' : '')}>{bk ? String(bk.overall).toUpperCase() : '…'}</div>
          <div className="tk-next">{bk?.services ? Object.keys(bk.services).length + ' services' : 'no report'}</div>
        </RLink>
        <RLink className="widget w-proj glass" to="/trends">
          <div className="w-head"><span className="w-ic"><Icon name="briefcase" size={15} /></span><h3>Projects</h3></div>
          <div className="svc-big"><b>{proj?.solova ? proj.solova.started + proj.solova.notStarted : '–'}</b><span>active tasks</span></div>
          <div className="tk-next">{proj?.solova ? `${proj.solova.started} started · ${proj.solova.notStarted} to do` : 'not configured'}</div>
        </RLink>
        <RLink className="widget w-trend glass" to="/trends">
          <div className="w-head"><span className="w-ic"><Icon name="rocket" size={15} /></span><h3>Trending</h3></div>
          {trend?.repos?.[0]
            ? <><div className="trend-top" dir="ltr">{trend.repos[0].name}</div>
                <div className="tk-next">{trend.repos[0].starsToday != null ? `▲ ${trend.repos[0].starsToday.toLocaleString()} stars today` : 'GitHub · today'}</div></>
            : <div className="tk-next">GitHub · today</div>}
        </RLink>
      </section>
    </div>
  )
}
