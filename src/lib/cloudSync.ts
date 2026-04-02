import { exportFullBackup, importFullBackup, isBackupPackage } from './jsonExport'

export interface CloudSyncSettings {
  spaceId: string
  secret: string
  apiBaseUrl: string
}

export interface CloudStatus {
  updatedAt: number
}

const STORAGE_KEY = 'cloudSyncSettings'

export function getCloudSyncSettings(): CloudSyncSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { spaceId: '', secret: '', apiBaseUrl: '' }
    const parsed = JSON.parse(raw) as Partial<CloudSyncSettings>
    return {
      spaceId: parsed.spaceId ?? '',
      secret: parsed.secret ?? '',
      apiBaseUrl: parsed.apiBaseUrl ?? '',
    }
  } catch {
    return { spaceId: '', secret: '', apiBaseUrl: '' }
  }
}

export function saveCloudSyncSettings(settings: CloudSyncSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function encode(value: string): string {
  return encodeURIComponent(value)
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function cloudEndpoint(apiBaseUrl: string, path: 'status' | 'save' | 'load'): string {
  const normalized = trimTrailingSlash(apiBaseUrl.trim())
  if (!normalized) return `/api/cloud/${path}`
  if (normalized.endsWith('/api/cloud')) return `${normalized}/${path}`
  if (normalized.endsWith('/api')) return `${normalized}/cloud/${path}`
  return `${normalized}/api/cloud/${path}`
}

export async function getCloudStatus(spaceId: string, apiBaseUrl: string): Promise<CloudStatus> {
  const response = await fetch(`${cloudEndpoint(apiBaseUrl, 'status')}?spaceId=${encode(spaceId)}`)
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo consultar el estado del servidor')
  }
  return { updatedAt: payload.updatedAt as number }
}

export async function uploadCurrentBackup(spaceId: string, secret: string, apiBaseUrl: string): Promise<CloudStatus> {
  const backup = await exportFullBackup()
  const response = await fetch(cloudEndpoint(apiBaseUrl, 'save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spaceId, secret, backup }),
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo subir la copia al servidor')
  }
  return { updatedAt: payload.updatedAt as number }
}

export async function downloadBackup(
  spaceId: string,
  secret: string,
  apiBaseUrl: string
): Promise<{ backup: unknown; updatedAt: number }> {
  const response = await fetch(`${cloudEndpoint(apiBaseUrl, 'load')}?spaceId=${encode(spaceId)}&secret=${encode(secret)}`)
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
  return { updatedAt }
}
