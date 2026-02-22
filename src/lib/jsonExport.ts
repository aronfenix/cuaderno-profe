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
  templates: InstrumentTemplate[]
  assessments: unknown[]
  snapshots: unknown[]
  results: unknown[]
  criterionScores: unknown[]
}

export async function exportFullBackup(): Promise<BackupPackage> {
  const [
    academicYears, classGroups, students, enrollments, subjects,
    templates, assessments, snapshots, results, criterionScores
  ] = await Promise.all([
    db.academicYears.toArray(),
    db.classGroups.toArray(),
    db.students.toArray(),
    db.enrollments.toArray(),
    db.subjects.toArray(),
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
