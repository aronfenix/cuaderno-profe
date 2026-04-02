import { exportFullBackup, importFullBackup, isBackupPackage } from './jsonExport'

export interface CloudSyncSettings {
  spaceId: string
  secret: string
}

export interface CloudStatus {
  updatedAt: number
}

const STORAGE_KEY = 'cloudSyncSettings'

export function getCloudSyncSettings(): CloudSyncSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { spaceId: '', secret: '' }
    const parsed = JSON.parse(raw) as Partial<CloudSyncSettings>
    return {
      spaceId: parsed.spaceId ?? '',
      secret: parsed.secret ?? '',
    }
  } catch {
    return { spaceId: '', secret: '' }
  }
}

export function saveCloudSyncSettings(settings: CloudSyncSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function encode(value: string): string {
  return encodeURIComponent(value)
}

export async function getCloudStatus(spaceId: string): Promise<CloudStatus> {
  const response = await fetch(`/api/cloud/status?spaceId=${encode(spaceId)}`)
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo consultar el estado del servidor')
  }
  return { updatedAt: payload.updatedAt as number }
}

export async function uploadCurrentBackup(spaceId: string, secret: string): Promise<CloudStatus> {
  const backup = await exportFullBackup()
  const response = await fetch('/api/cloud/save', {
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

export async function downloadBackup(spaceId: string, secret: string): Promise<{ backup: unknown; updatedAt: number }> {
  const response = await fetch(`/api/cloud/load?spaceId=${encode(spaceId)}&secret=${encode(secret)}`)
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo descargar la copia del servidor')
  }
  return {
    backup: payload.backup,
    updatedAt: payload.updatedAt as number,
  }
}

export async function restoreBackupFromCloud(spaceId: string, secret: string): Promise<CloudStatus> {
  const { backup, updatedAt } = await downloadBackup(spaceId, secret)
  if (!isBackupPackage(backup)) {
    throw new Error('El servidor devolvio un backup invalido')
  }
  await importFullBackup(backup)
  return { updatedAt }
}
