import { db } from '../db/schema'
import { getCloudSyncSettings, resetLocalDatabaseFromCloud } from './cloudSync'

export const FORCE_CLOUD_RESTORE_KEY = 'cuaderno_force_cloud_restore'

export async function restoreEmptyLocalDatabaseFromCloud(): Promise<boolean> {
  const shouldForceRestore = localStorage.getItem(FORCE_CLOUD_RESTORE_KEY) === '1'

  if (!shouldForceRestore) {
    const [studentCount, groupCount] = await Promise.all([
      db.students.count(),
      db.classGroups.count(),
    ])
    if (studentCount > 0 || groupCount > 0) return false
  }

  const settings = getCloudSyncSettings()
  if (!settings.spaceId.trim() || !settings.secret.trim()) return false

  try {
    await resetLocalDatabaseFromCloud(
      settings.spaceId.trim(),
      settings.secret,
      settings.apiBaseUrl
    )
  } finally {
    localStorage.removeItem(FORCE_CLOUD_RESTORE_KEY)
  }

  return true
}
