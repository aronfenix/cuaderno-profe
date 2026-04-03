import { db } from '../db/schema'
import type { InstrumentTemplate } from '../types'

export interface BackupPackage {
  version: '1.0'
  exportedAt: number
  academicYears: unknown[]
  classGroups: unknown[]
  students: unknown[]
  enrollments: unknown[]
  subjects: unknown[]
  studentNotes?: unknown[]
  checklists?: unknown[]
  checklistEntries?: unknown[]
  teamArrangements?: unknown[]
  teams?: unknown[]
  teamMemberships?: unknown[]
  templates: InstrumentTemplate[]
  assessments: unknown[]
  snapshots: unknown[]
  results: unknown[]
  criterionScores: unknown[]
}

export async function exportFullBackup(): Promise<BackupPackage> {
  const [
    academicYears, classGroups, students, enrollments, subjects,
    studentNotes, checklists, checklistEntries, teamArrangements, teams, teamMemberships,
    templates, assessments, snapshots, results, criterionScores
  ] = await Promise.all([
    db.academicYears.toArray(),
    db.classGroups.toArray(),
    db.students.toArray(),
    db.enrollments.toArray(),
    db.subjects.toArray(),
    db.studentNotes.toArray(),
    db.checklists.toArray(),
    db.checklistEntries.toArray(),
    db.teamArrangements.toArray(),
    db.teams.toArray(),
    db.teamMemberships.toArray(),
    db.templates.toArray(),
    db.assessments.toArray(),
    db.snapshots.toArray(),
    db.results.toArray(),
    db.criterionScores.toArray(),
  ])

  return {
    version: '1.0',
    exportedAt: Date.now(),
    academicYears, classGroups, students, enrollments, subjects,
    studentNotes, checklists, checklistEntries, teamArrangements, teams, teamMemberships,
    templates, assessments, snapshots, results, criterionScores
  }
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parseTemplateJSON(raw: string): InstrumentTemplate[] {
  const parsed = JSON.parse(raw)
  // Accept either a single template or an array
  const arr = Array.isArray(parsed) ? parsed : [parsed]
  return arr.filter((t: unknown) =>
    t !== null &&
    typeof t === 'object' &&
    'title' in (t as object) &&
    'criteria' in (t as object)
  )
}

export function isBackupPackage(value: unknown): value is BackupPackage {
  if (!value || typeof value !== 'object') return false
  const backup = value as Partial<BackupPackage>
  return (
    backup.version === '1.0' &&
    Array.isArray(backup.academicYears) &&
    Array.isArray(backup.classGroups) &&
    Array.isArray(backup.students) &&
    Array.isArray(backup.enrollments) &&
    Array.isArray(backup.subjects) &&
    Array.isArray(backup.templates) &&
    Array.isArray(backup.assessments) &&
    Array.isArray(backup.snapshots) &&
    Array.isArray(backup.results) &&
    Array.isArray(backup.criterionScores)
  )
}

export async function importFullBackup(backup: BackupPackage): Promise<void> {
  if (!isBackupPackage(backup)) {
    throw new Error('Formato de backup no valido')
  }

  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.academicYears.clear(),
      db.classGroups.clear(),
      db.students.clear(),
      db.enrollments.clear(),
      db.subjects.clear(),
      db.studentNotes.clear(),
      db.checklists.clear(),
      db.checklistEntries.clear(),
      db.teamArrangements.clear(),
      db.teams.clear(),
      db.teamMemberships.clear(),
      db.templates.clear(),
      db.assessments.clear(),
      db.snapshots.clear(),
      db.results.clear(),
      db.criterionScores.clear(),
    ])

    if (backup.academicYears.length) await db.academicYears.bulkAdd(backup.academicYears as any[])
    if (backup.classGroups.length) await db.classGroups.bulkAdd(backup.classGroups as any[])
    if (backup.students.length) await db.students.bulkAdd(backup.students as any[])
    if (backup.enrollments.length) await db.enrollments.bulkAdd(backup.enrollments as any[])
    if (backup.subjects.length) await db.subjects.bulkAdd(backup.subjects as any[])
    if ((backup.studentNotes ?? []).length) await db.studentNotes.bulkAdd((backup.studentNotes ?? []) as any[])
    if ((backup.checklists ?? []).length) await db.checklists.bulkAdd((backup.checklists ?? []) as any[])
    if ((backup.checklistEntries ?? []).length) await db.checklistEntries.bulkAdd((backup.checklistEntries ?? []) as any[])
    if ((backup.teamArrangements ?? []).length) await db.teamArrangements.bulkAdd((backup.teamArrangements ?? []) as any[])
    if ((backup.teams ?? []).length) await db.teams.bulkAdd((backup.teams ?? []) as any[])
    if ((backup.teamMemberships ?? []).length) await db.teamMemberships.bulkAdd((backup.teamMemberships ?? []) as any[])
    if (backup.templates.length) await db.templates.bulkAdd(backup.templates as any[])
    if (backup.assessments.length) await db.assessments.bulkAdd(backup.assessments as any[])
    if (backup.snapshots.length) await db.snapshots.bulkAdd(backup.snapshots as any[])
    if (backup.results.length) await db.results.bulkAdd(backup.results as any[])
    if (backup.criterionScores.length) await db.criterionScores.bulkAdd(backup.criterionScores as any[])
  })
}
