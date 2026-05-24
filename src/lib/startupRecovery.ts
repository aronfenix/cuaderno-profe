import { db } from '../db/schema'
import { getCloudSyncSettings, resetLocalDatabaseFromCloud } from './cloudSync'

export async function restoreEmptyLocalDatabaseFromCloud(): Promise<boolean> {
  const [studentCount, groupCount] = await Promise.all([
    db.students.count(),
    db.classGroups.count(),
  ])
  if (studentCount > 0 || groupCount > 0) return false

  const settings = getCloudSyncSettings()
  if (!settings.spaceId.trim() || !settings.secret.trim()) return false

  await resetLocalDatabaseFromCloud(
    settings.spaceId.trim(),
    settings.secret,
    settings.apiBaseUrl
  )

  return true
}
