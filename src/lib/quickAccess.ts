export interface QuickAccessItem {
  path: string
  label: string
  icon: string
}

export interface RecentVisit extends QuickAccessItem {
  visitedAt: number
}

const FAVORITES_KEY = 'dashboardFavorites'
const RECENTS_KEY = 'dashboardRecents'
const MAX_RECENTS = 8

export const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  { path: '/assessments/new', label: 'Nueva evaluacion', icon: '✅' },
  { path: '/checklists', label: 'Lista y checklist', icon: '☑️' },
  { path: '/studio', label: 'Asistente de rubricas', icon: '🧭' },
  { path: '/insights', label: 'Analitica', icon: '📈' },
  { path: '/setup', label: 'Grupos y alumnado', icon: '👥' },
  { path: '/settings', label: 'Ajustes', icon: '⚙️' },
]

const DEFAULT_FAVORITES = ['/assessments/new', '/checklists', '/studio', '/setup']

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function getFavoritePaths(): string[] {
  const data = parseJson<string[]>(localStorage.getItem(FAVORITES_KEY), DEFAULT_FAVORITES)
  return data.filter(path => QUICK_ACCESS_ITEMS.some(item => item.path === path))
}

function saveFavoritePaths(paths: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(paths))
}

export function toggleFavoritePath(path: string): string[] {
  const current = getFavoritePaths()
  const exists = current.includes(path)
  const next = exists
    ? current.filter(item => item !== path)
    : [...current, path]
  saveFavoritePaths(next)
  return next
}

export function getRecentVisits(): RecentVisit[] {
  const data = parseJson<RecentVisit[]>(localStorage.getItem(RECENTS_KEY), [])
  return data
    .filter(item => typeof item.path === 'string' && typeof item.label === 'string' && typeof item.icon === 'string')
    .slice(0, MAX_RECENTS)
}

function saveRecentVisits(items: RecentVisit[]): void {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)))
}

function describePath(pathname: string): QuickAccessItem | null {
  const exact = QUICK_ACCESS_ITEMS.find(item => item.path === pathname)
  if (exact) return exact

  if (pathname === '/' || pathname === '') return { path: '/', label: 'Inicio', icon: '🏠' }
  if (pathname.startsWith('/assessments/') && pathname.includes('/grade/')) return { path: pathname, label: 'Calificar', icon: '✍️' }
  if (pathname.startsWith('/assessments/') && pathname.endsWith('/results')) return { path: pathname, label: 'Resultados', icon: '📊' }
  if (pathname.startsWith('/assessments/')) return { path: pathname, label: 'Detalle evaluacion', icon: '✅' }
  if (pathname.startsWith('/students/')) return { path: pathname, label: 'Ficha alumno', icon: '👤' }
  if (pathname === '/assessments') return { path: pathname, label: 'Evaluar', icon: '✅' }
  if (pathname === '/library') return { path: pathname, label: 'Rubricas', icon: '📋' }

  return null
}

export function recordRecentPath(pathname: string): void {
  const meta = describePath(pathname)
  if (!meta) return
  if (meta.path === '/') return

  const item: RecentVisit = { ...meta, visitedAt: Date.now() }
  const current = getRecentVisits()
  const next = [item, ...current.filter(entry => entry.path !== item.path)]
  saveRecentVisits(next)
}
