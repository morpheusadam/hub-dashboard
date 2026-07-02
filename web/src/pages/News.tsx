import React, { useEffect, useState } from 'react'
import { Icon, Spinner } from '../ui'
import { getNews, favicon, NewsItem } from '../api'

const TOPICS = [
  { key: 'tech', label: 'Top Tech' },
  { key: 'ai', label: 'AI & ML' },
  { key: 'programming', label: 'Programming' },
  { key: 'devops', label: 'DevOps & Cloud' },
  { key: 'show', label: 'Show HN' },
]

const imgProxy = (u: string) => `/api/img.php?u=${encodeURIComponent(u)}`
function Thumb({ n }: { n: NewsItem }) {
  const [fail, setFail] = useState(false)
  if (n.image && !fail) return <img className="ni-img" src={imgProxy(n.image)} alt="" loading="lazy" onError={() => setFail(true)} />
  return <div className="ni-img fav"><img src={favicon(n.source)} alt="" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} /></div>
}

export default function NewsPage() {
  const [topic, setTopic] = useState('tech')
  const [items, setItems] = useState<NewsItem[] | null>(null)
  useEffect(() => { setItems(null); getNews(topic).then(setItems) }, [topic])
  return (
    <div className="wrap">
      <div className="page-head"><h1>Tech News</h1><span className="muted">Live from Hacker News</span></div>
      <div className="chips">
        {TOPICS.map(t => <button key={t.key} className={'chip' + (t.key === topic ? ' on' : '')} onClick={() => setTopic(t.key)}>{t.label}</button>)}
      </div>
      {!items && <div className="pad"><Spinner /></div>}
      {items && (
        <div className="news-grid">
          {items.map((n, i) => (
            <a key={i} className="news-card glass" href={n.url} target="_blank" rel="noreferrer">
              <Thumb n={n} />
              <div className="nc-body">
                <div className="nc-title">{n.title}</div>
                <div className="nc-meta">
                  <span className="nc-src">{n.source}</span>
                  {typeof n.points === 'number' && <span><Icon name="zap" size={11} /> {n.points}</span>}
                  {typeof n.comments === 'number' && <span><Icon name="message" size={11} /> {n.comments}</span>}
                  {n.age && <span>{n.age}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
      {items && !items.length && <div className="empty glass"><p>No news right now.</p></div>}
    </div>
  )
}
