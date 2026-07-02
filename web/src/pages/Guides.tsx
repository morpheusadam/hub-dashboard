import React, { useState } from 'react'
import { Icon } from '../ui'

type Article = { icon: string; title: string; tag: string; body: (string | string[])[] }

const ARTICLES: Article[] = [
  {
    icon: 'zap', tag: 'Ideation', title: 'From Blank Page to Breakthrough: A Practical Ideation System',
    body: [
      'Great ideas are rarely a flash of genius — they are the output of a repeatable process. Treat ideation like engineering: give it inputs, constraints, and iterations.',
      'The 5-step loop I recommend:',
      ['Capture the problem, not the solution — write the pain in one sentence ("I lose time switching between tools").',
        'Diverge widely — generate 20 rough ideas without judging. Quantity first; quality is a later pass.',
        'Combine & twist — merge two unrelated ideas, or invert the problem ("what if the tool came to me?").',
        'Constrain hard — pick the version you could ship this weekend. Constraints force creativity.',
        'Prototype the smallest testable slice — a fake button, a mock screen, a one-file script.'],
      'Keep an "idea inbox" (your Notes tab). Revisit weekly — most breakthroughs come from recombining old notes, not new thoughts.',
    ],
  },
  {
    icon: 'grid', tag: 'Workflow', title: 'The Developer Command Center: Access Everything From One Place',
    body: [
      'Context-switching is the silent tax on developer productivity. A personal hub fights it by becoming a single pane of glass over your whole stack.',
      'Principles of a fast command center:',
      ['Keyboard-first — a command palette (Ctrl/⌘K) beats clicking every time.',
        'One click to anything — services, dashboards, repos, docs as launchable icons.',
        'Glanceable status — health of your containers/domains visible without opening ten tabs.',
        'Bring the outside in — news, notifications and tasks live next to your tools, not in scattered apps.',
        'Automation over memory — let the system remember (backups, reminders), so you don\'t.'],
      'This hub already gives you: launcher icons, ⌘K search, live domain/service health (System), rotating focus wallpapers, tasks with desktop reminders, and a tech-news feed.',
    ],
  },
  {
    icon: 'cpu', tag: 'Infra', title: 'Run Your Home Lab Like Production',
    body: [
      'A hobby stack becomes reliable when you borrow a few production habits — without the overhead.',
      ['Everything in Docker Compose, everything with restart: unless-stopped, so a reboot self-heals.',
        'Automated, rotating, off-site backups (you have daily pg_dumps + Backblaze). A backup you never restored is a wish, not a backup — test one.',
        'One reverse entry point (Cloudflare Tunnel) instead of exposing ports; keep DNS boring.',
        'Observability: a simple up/down board (System tab) catches 90% of incidents early.',
        'Write down the "why" — a short infra note saves your future self hours.'],
    ],
  },
  {
    icon: 'bot', tag: 'AI', title: 'Working With AI Tools Like a Senior Engineer',
    body: [
      'AI multiplies output only when you drive it deliberately. A few habits that compound:',
      ['Keep your favorite models one click away (add ChatGPT, Claude, Perplexity, v0 as apps).',
        'Prompt with context: paste the real file, the error, the constraint — not a paraphrase.',
        'Use AI for the first 80% (scaffold, boilerplate, refactor) and own the last 20% (judgment, security).',
        'Verify, then trust — treat AI output like a confident junior: review before shipping.',
        'Capture great prompts as reusable notes; your prompt library becomes an asset.'],
    ],
  },
  {
    icon: 'rocket', tag: 'Roadmap', title: 'Hub Roadmap — What I\'d Build Next',
    body: [
      'Ideas to make this hub do even more of your work, ranked by value:',
      ['Live container widget — pull docker ps via a small API so you see running services & CPU right on the board.',
        'Weather + prayer/召 times for Iran & Turkey next to the dual clock.',
        'Quick-launch groups on ⌘K (type "erp" → open ERPNext; type "gh" → GitHub).',
        'RSS aggregator — add your own feeds (GitHub releases, blogs) beside Hacker News.',
        'One-click backup trigger + last-run status badge in the nav.',
        'Uptime history sparkline per domain, with a browser alert when one goes down.',
        'Notes → tasks: turn any note line into a reminder.'],
      'Tell me which ones you want and I\'ll build them.',
    ],
  },
]

export default function GuidesPage() {
  const [open, setOpen] = useState(0)
  return (
    <div className="wrap">
      <div className="page-head"><h1>Guides & Ideas</h1><span className="muted">Playbooks for building, shipping and thinking better</span></div>
      <div className="guides">
        {ARTICLES.map((a, i) => (
          <article key={i} className={'guide glass' + (open === i ? ' open' : '')}>
            <button className="g-head" onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="g-icon"><Icon name={a.icon} size={18} /></span>
              <div className="g-titles"><span className="g-tag">{a.tag}</span><h2>{a.title}</h2></div>
              <Icon name={open === i ? 'x' : 'plus'} size={16} className="g-toggle" />
            </button>
            {open === i && (
              <div className="g-body">
                {a.body.map((b, j) => Array.isArray(b)
                  ? <ul key={j}>{b.map((li, k) => <li key={k}>{li}</li>)}</ul>
                  : <p key={j}>{b}</p>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
