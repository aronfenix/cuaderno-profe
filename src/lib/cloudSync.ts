import { exportFullBackup, importFullBackup, isBackupPackage } from './jsonExport'

export interface CloudSyncSettings {
  spaceId: string
  secret: string
  apiBaseUrl: string
}

export interface CloudStatus {
  updatedAt: number
}

export interface CloudSyncMeta {
  lastCloudUpdatedAt: number
  lastLocalDataUpdatedAt: number
  lastSyncAt: number
}

export interface SmartSyncResult {
  action: 'uploaded' | 'downloaded' | 'noop' | 'conflict'
  updatedAt: number
  message: string
}

const STORAGE_KEY = 'cloudSyncSettings'
const META_KEY = 'cloudSyncMeta'
export const DEFAULT_CLOUD_API_BASE_URL = 'https://cuaderno-profe-sync.cuaderno-alvar-x100.workers.dev'

export function getCloudSyncSettings(): CloudSyncSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { spaceId: '', secret: '', apiBaseUrl: DEFAULT_CLOUD_API_BASE_URL }
    const parsed = JSON.parse(raw) as Partial<CloudSyncSettings>
    return {
      spaceId: parsed.spaceId ?? '',
      secret: parsed.secret ?? '',
      apiBaseUrl: parsed.apiBaseUrl ?? DEFAULT_CLOUD_API_BASE_URL,
    }
  } catch {
    return { spaceId: '', secret: '', apiBaseUrl: DEFAULT_CLOUD_API_BASE_URL }
  }
}

export function saveCloudSyncSettings(settings: CloudSyncSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...settings,
    apiBaseUrl: settings.apiBaseUrl.trim() || DEFAULT_CLOUD_API_BASE_URL,
  }))
}

function encode(value: string): string {
  return encodeURIComponent(value)
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function cloudEndpoint(apiBaseUrl: string, path: 'status' | 'save' | 'load'): string {
  const normalized = trimTrailingSlash(apiBaseUrl.trim() || DEFAULT_CLOUD_API_BASE_URL)
  if (normalized.endsWith('/api/cloud')) return `${normalized}/${path}`
  if (normalized.endsWith('/api')) return `${normalized}/cloud/${path}`
  return `${normalized}/api/cloud/${path}`
}

export function getCloudSyncMeta(): CloudSyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return { lastCloudUpdatedAt: 0, lastLocalDataUpdatedAt: 0, lastSyncAt: 0 }
    const parsed = JSON.parse(raw) as Partial<CloudSyncMeta>
    return {
      lastCloudUpdatedAt: Number(parsed.lastCloudUpdatedAt ?? 0),
      lastLocalDataUpdatedAt: Number(parsed.lastLocalDataUpdatedAt ?? 0),
      lastSyncAt: Number(parsed.lastSyncAt ?? 0),
    }
  } catch {
    return { lastCloudUpdatedAt: 0, lastLocalDataUpdatedAt: 0, lastSyncAt: 0 }
  }
}

function saveCloudSyncMeta(meta: CloudSyncMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

function maxTimestampFromValue(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  const record = value as Record<string, unknown>
  return Math.max(
    Number(record.updatedAt ?? 0),
    Number(record.createdAt ?? 0),
    Number(record.completedAt ?? 0)
  )
}

export async function getLocalDataUpdatedAt(): Promise<number> {
  const backup = await exportFullBackup()
  return Math.max(
    ...backup.academicYears.map(maxTimestampFromValue),
    ...backup.classGroups.map(maxTimestampFromValue),
    ...backup.students.map(maxTimestampFromValue),
    ...backup.enrollments.map(maxTimestampFromValue),
    ...backup.subjects.map(maxTimestampFromValue),
    ...(backup.studentNotes ?? []).map(maxTimestampFromValue),
    ...(backup.checklists ?? []).map(maxTimestampFromValue),
    ...(backup.checklistEntries ?? []).map(maxTimestampFromValue),
    ...(backup.teamArrangements ?? []).map(maxTimestampFromValue),
    ...(backup.teams ?? []).map(maxTimestampFromValue),
    ...(backup.teamMemberships ?? []).map(maxTimestampFromValue),
    ...backup.templates.map(maxTimestampFromValue),
    ...backup.assessments.map(maxTimestampFromValue),
    ...backup.snapshots.map(maxTimestampFromValue),
    ...backup.results.map(maxTimestampFromValue),
    ...backup.criterionScores.map(maxTimestampFromValue),
    0
  )
}

export async function getPendingLocalChanges(): Promise<boolean> {
  const meta = getCloudSyncMeta()
  const localUpdatedAt = await getLocalDataUpdatedAt()
  return localUpdatedAt > meta.lastLocalDataUpdatedAt
}

export async function getCloudStatus(spaceId: string, apiBaseUrl: string): Promise<CloudStatus> {
  const response = await fetch(
    `${cloudEndpoint(apiBaseUrl, 'status')}?spaceId=${encode(spaceId)}&t=${Date.now()}`,
    { cache: 'no-store' }
  )
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo consultar el estado del servidor')
  }
  return { updatedAt: payload.updatedAt as number }
}

export async function uploadCurrentBackup(spaceId: string, secret: string, apiBaseUrl: string): Promise<CloudStatus> {
  const backup = await exportFullBackup()
  const localDataUpdatedAt = await getLocalDataUpdatedAt()
  const response = await fetch(cloudEndpoint(apiBaseUrl, 'save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spaceId, secret, backup }),
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo subir la copia al servidor')
  }
  saveCloudSyncMeta({
    lastCloudUpdatedAt: payload.updatedAt as number,
    lastLocalDataUpdatedAt: localDataUpdatedAt,
    lastSyncAt: Date.now(),
  })
  return { updatedAt: payload.updatedAt as number }
}

export async function downloadBackup(
  spaceId: string,
  secret: string,
  apiBaseUrl: string
): Promise<{ backup: unknown; updatedAt: number }> {
  const response = await fetch(
    `${cloudEndpoint(apiBaseUrl, 'load')}?spaceId=${encode(spaceId)}&secret=${encode(secret)}&t=${Date.now()}`,
    { cache: 'no-store' }
  )
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo descargar la copia del servidor')
  }
  return {
    backup: payload.backup,
    updatedAt: payload.updatedAt as number,
  }
}

export async function restoreBackupFromCloud(spaceId: string, secret: string, apiBaseUrl: string): Promise<CloudStatus> {
  const { backup, updatedAt } = await downloadBackup(spaceId, secret, apiBaseUrl)
  if (!isBackupPackage(backup)) {
    throw new Error('El servidor devolvio un backup invalido')
  }
  await importFullBackup(backup)
  saveCloudSyncMeta({
    lastCloudUpdatedAt: updatedAt,
    lastLocalDataUpdatedAt: await getLocalDataUpdatedAt(),
    lastSyncAt: Date.now(),
  })
  return { updatedAt }
}

export async function smartSync(spaceId: string, secret: string, apiBaseUrl: string): Promise<SmartSyncResult> {
  const resolvedApiBaseUrl = apiBaseUrl.trim() || DEFAULT_CLOUD_API_BASE_URL
  const meta = getCloudSyncMeta()
  const localUpdatedAt = await getLocalDataUpdatedAt()
  const hasLocalChanges = localUpdatedAt > meta.lastLocalDataUpdatedAt

  let status: CloudStatus | null = null
  try {
    status = await getCloudStatus(spaceId, resolvedApiBaseUrl)
  } catch (error) {
    const message = (error as Error).message.toLowerCase()
    if (!message.includes('no existe')) throw error
  }

  if (!status) {
    const uploaded = await uploadCurrentBackup(spaceId, secret, resolvedApiBaseUrl)
    return {
      action: 'uploaded',
      updatedAt: uploaded.updatedAt,
      message: 'No habia copia en servidor. He subido esta copia local.',
    }
  }

  if (meta.lastSyncAt === 0) {
    if (localUpdatedAt > status.updatedAt) {
      const uploaded = await uploadCurrentBackup(spaceId, secret, resolvedApiBaseUrl)
      return {
        action: 'uploaded',
        updatedAt: uploaded.updatedAt,
        message: 'Primer uso en este dispositivo: he subido esta copia porque parece mas reciente que la del servidor.',
      }
    }

    const restored = await restoreBackupFromCloud(spaceId, secret, resolvedApiBaseUrl)
    return {
      action: 'downloaded',
      updatedAt: restored.updatedAt,
      message: 'Primer uso en este dispositivo: he descargado la copia del servidor.',
    }
  }

  const serverHasNewerData = status.updatedAt > meta.lastCloudUpdatedAt

  if (hasLocalChanges && serverHasNewerData) {
    return {
      action: 'conflict',
      updatedAt: status.updatedAt,
      message: 'Hay cambios locales y tambien una copia mas reciente en servidor. Usa subir o descargar manualmente para decidir.',
    }
  }

  if (hasLocalChanges) {
    const uploaded = await uploadCurrentBackup(spaceId, secret, resolvedApiBaseUrl)
    return {
      action: 'uploaded',
      updatedAt: uploaded.updatedAt,
      message: 'He subido los cambios locales al servidor.',
    }
  }

  if (serverHasNewerData) {
    const restored = await restoreBackupFromCloud(spaceId, secret, resolvedApiBaseUrl)
    return {
      action: 'downloaded',
      updatedAt: restored.updatedAt,
      message: 'He descargado la copia mas reciente del servidor.',
    }
  }

  saveCloudSyncMeta({
    lastCloudUpdatedAt: status.updatedAt,
    lastLocalDataUpdatedAt: localUpdatedAt,
    lastSyncAt: Date.now(),
  })

  return {
    action: 'noop',
    updatedAt: status.updatedAt,
    message: 'Todo esta sincronizado.',
  }
}
