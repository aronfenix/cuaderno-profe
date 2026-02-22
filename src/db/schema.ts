import Dexie, { type Table } from 'dexie'
import type {
  AcademicYear, ClassGroup, Student, Enrollment, Subject,
  InstrumentTemplate, Assessment, InstrumentSnapshot,
  StudentAssessmentResult, CriterionScore
} from '../types'

export class CuadernoDb extends Dexie {
  academicYears!: Table<AcademicYear, number>
  classGroups!: Table<ClassGroup, number>
  students!: Table<Student, number>
  enrollments!: Table<Enrollment, number>
  subjects!: Table<Subject, number>
  templates!: Table<InstrumentTemplate, number>
  assessments!: Table<Assessment, number>
  snapshots!: Table<InstrumentSnapshot, number>
  results!: Table<StudentAssessmentResult, number>
  criterionScores!: Table<CriterionScore, number>

  constructor() {
    super('CuadernoProfe')

    // v1 — initial schema (kept so Dexie can upgrade existing DBs)
    this.version(1).stores({
      academicYears:   '++id, name, isActive, syncStatus',
      classGroups:     '++id, yearId, name, syncStatus',
      students:        '++id, displayName, syncStatus',
      enrollments:     '++id, studentId, groupId, yearId',
      subjects:        '++id, yearId, name, syncStatus',
      templates:       '++id, title, source, syncStatus, updatedAt',
      assessments:     '++id, groupId, subjectId, templateId, snapshotId, status, date, syncStatus',
      snapshots:       '++id, templateId, assessmentId',
      results:         '++id, assessmentId, studentId, status, syncStatus, updatedAt, [assessmentId+studentId]',
      criterionScores: '++id, resultId, criterionId, [resultId+criterionId]',
    })

    // v2 — add missing indexes (data preserved, only index structure changes)
    this.version(2).stores({
      academicYears:   '++id, name, isActive, syncStatus',
      classGroups:     '++id, yearId, name, syncStatus',
      students:        '++id, displayName, syncStatus',
      // [studentId+groupId] needed by StudentsRepo.enroll dedup check
      enrollments:     '++id, studentId, groupId, yearId, [studentId+groupId]',
      subjects:        '++id, yearId, name, syncStatus',
      templates:       '++id, title, source, syncStatus, updatedAt',
      // updatedAt index needed by Dashboard.tsx orderBy('updatedAt')
      assessments:     '++id, groupId, subjectId, templateId, snapshotId, status, date, updatedAt, syncStatus',
      snapshots:       '++id, templateId, assessmentId',
      results:         '++id, assessmentId, studentId, status, syncStatus, updatedAt, [assessmentId+studentId]',
      criterionScores: '++id, resultId, criterionId, [resultId+criterionId]',
    })
  }
}

export const db = new CuadernoDb()
