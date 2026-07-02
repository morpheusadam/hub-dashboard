// Thin client over the PHP backend. The auth cookie (hub_auth) rides along.
async function j(res: Response) {
  const t = await res.text()
  try { return JSON.parse(t) } catch { return { _raw: t } }
}
export async function apiGet(path: string) {
  const r = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
  return { status: r.status, data: await j(r) }
}
export async function apiPost(path: string, body?: any) {
  const r = await fetch(path, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: r.status, data: await j(r) }
}

export type Link = { id: string; title: string; url: string; icon?: string }
export type List = { id: string; title: string; icon?: string; links: Link[] }
export type Board = { lists: List[]; timers?: any[]; settings?: any }
export type Note = { id: string; title: string; body: string; updated: number }

export const getBoard = () => apiGet('/api/data.php').then(r => r.data as Board)
export const saveBoard = (b: Board) => apiPost('/api/data.php', b)
export const getNotes = () => apiGet('/api/notes.php').then(r => (r.data?.notes ?? []) as Note[])
export const saveNotes = (notes: Note[]) => apiPost('/api/notes.php', { notes })
export const getStatus = () => apiGet('/api/status.php').then(r => r.data)
export const getSystem = () => apiGet('/api/system.php?action=status').then(r => r.data)
export const setAutostart = (on: boolean) => apiPost('/api/system.php', { action: on ? 'enable' : 'disable' })
export const pushGit = () => apiPost('/api/push.php', {})
export const authCheck = () => apiGet('/api/auth.php').then(r => !!r.data?.authed)
export const login = (password: string, remember: boolean) => apiPost('/api/auth.php', { password, remember })
export const logout = () => apiPost('/api/auth.php', { action: 'logout' })
export const iconUrl = (u: string) => {
  try { return `/api/icon.php?d=${encodeURIComponent(new URL(u).hostname)}` } catch { return '/api/icon.php?d=' }
}
export const getNews = (topic = 'tech') => apiGet('/api/news.php?topic=' + topic).then(r => (r.data?.items ?? []) as NewsItem[])
export type WeatherLoc = { name: string; temp: number | null; code: number | null }
export const getWeather = () => apiGet('/api/weather.php').then(r => (r.data?.locations ?? []) as WeatherLoc[])
export type YTVideo = { title: string; videoId: string; url: string; thumb: string; channel: string; views: number; published: string }
export const getYT = () => apiGet('/api/ytfa.php').then(r => (r.data?.items ?? []) as YTVideo[])
export type Tweet = { text: string; image?: string | null; views: number; url: string; date?: string }
export const getTweet = () => apiGet('/api/tweet.php').then(r => r.data as Tweet)
export const imgProxy = (u: string) => `/api/img.php?u=${encodeURIComponent(u)}`
export type NewsItem = { title: string; url: string; source: string; image?: string | null; points?: number; comments?: number; author?: string; age?: string }
export const favicon = (host: string) => `/api/icon.php?d=${encodeURIComponent(host)}`
export const uid = () => Math.random().toString(36).slice(2, 12)

// --- Projects (Solova tasks + local repos), produced by the host cron exporter ---
export type SolovaStats = { started: number; notStarted: number; done: number; total: number }
export type Repo = { name: string; branch: string; updated: number; subject: string }
export type Projects = { solova: SolovaStats | null; repos: Repo[]; lavzenUpdated: number | null; generated: number | null }
export const getProjects = () => apiGet('/api/projects.php').then(r => r.data as Projects)

// --- GitHub trending (daily) + AI slice ---
export type TrendRepo = { name: string; url: string; desc?: string; fa?: string; lang?: string | null; starsToday?: number | null; stars?: number | null }
export type Trending = { repos: TrendRepo[]; ai: TrendRepo[]; generated?: number }
export const getTrending = () => apiGet('/api/trending.php').then(r => r.data as Trending)

// --- Settings (data/settings.json) ---
export type Settings = {
  owner: string
  weather: { locations: { name: string; lat: number; lon: number }[] }
  youtube: { channels: string[] }
  tweets: { telegramChannel: string }
  services: { baseDomain: string; domains: string[] }
  wallpapers: { images: string[] }
  trends: { translateTo: string }
  github: { token: string; username: string }
  _hasGithubToken?: boolean
}
export const getSettings = () => apiGet('/api/settings.php').then(r => r.data as Settings)
export const saveSettings = (patch: any) => apiPost('/api/settings.php', patch)
