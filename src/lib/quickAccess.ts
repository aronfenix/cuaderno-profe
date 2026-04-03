export interface QuickAccessItem {
  path: string
  label: string
  icon: string
}

export interface RecentVisit extends QuickAccessItem {
  visitedAt: number
}

export interface PinnedFavorite extends QuickAccessItem {
  pinnedAt: number
}

const QUICK_FAVORITES_KEY = 'dashboardQuickFavorites'
const PINNED_FAVORITES_KEY = 'dashboardPinnedFavorites'
const LEGACY_FAVORITES_KEY = 'dashboardFavorites'
const RECENTS_KEY = 'dashboardRecents'
const MAX_RECENTS = 8
const MAX_PINNED = 12

export const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  { path: '/assessments/new', label: 'Nueva evaluacion', icon: '✅' },
  { path: '/checklists', label: 'Lista y checklist', icon: '☑️' },
  { path: '/studio', label: 'Asistente de rubricas', icon: '🧭' },
  { path: '/insights', label: 'Analitica', icon: '📈' },
  { path: '/setup', label: 'Grupos y alumnado', icon: '👥' },
  { path: '/settings', label: 'Ajustes', icon: '⚙️' },
]

const DEFAULT_QUICK_FAVORITES = ['/assessments/new', '/checklists', '/studio', '/setup']

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function validateQuickPath(path: string): boolean {
  return QUICK_ACCESS_ITEMS.some(item => item.path === path)
}

export function getFavoritePaths(): string[] {
  const modern = parseJson<string[] | null>(localStorage.getItem(QUICK_FAVORITES_KEY), null)
  const source = modern ?? parseJson<string[]>(localStorage.getItem(LEGACY_FAVORITES_KEY), DEFAULT_QUICK_FAVORITES)
  return source.filter(validateQuickPath)
}

function saveFavoritePaths(paths: string[]): void {
  localStorage.setItem(QUICK_FAVORITES_KEY, JSON.stringify(paths))
  localStorage.removeItem(LEGACY_FAVORITES_KEY)
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

export function getPinnedFavorites(): PinnedFavorite[] {
  const data = parseJson<PinnedFavorite[]>(localStorage.getItem(PINNED_FAVORITES_KEY), [])
  return data
    .filter(item =>
      typeof item.path === 'string' &&
      typeof item.label === 'string' &&
      typeof item.icon === 'string' &&
      typeof item.pinnedAt === 'number'
    )
    .sort((a, b) => b.pinnedAt - a.pinnedAt)
    .slice(0, MAX_PINNED)
}

function savePinnedFavorites(items: PinnedFavorite[]): void {
  localStorage.setItem(PINNED_FAVORITES_KEY, JSON.stringify(items.slice(0, MAX_PINNED)))
}

export function isPinnedFavorite(path: string): boolean {
  return getPinnedFavorites().some(item => item.path === path)
}

export function upsertPinnedFavorite(item: QuickAccessItem): PinnedFavorite[] {
  const current = getPinnedFavorites()
  const now = Date.now()
  const next: PinnedFavorite[] = [
    { ...item, pinnedAt: now },
    ...current.filter(existing => existing.path !== item.path),
  ]
  savePinnedFavorites(next)
  return next
}

export function removePinnedFavorite(path: string): PinnedFavorite[] {
  const next = getPinnedFavorites().filter(item => item.path !== path)
  savePinnedFavorites(next)
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
  if (pathname.startsWith('/checklists/')) return { path: pathname, label: 'Checklist', icon: '☑️' }
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
