import Dexie, { type Table } from 'dexie'
import type {
  AcademicYear, ClassGroup, Student, Enrollment, Subject, StudentNote, ChecklistSession, ChecklistEntry,
  TeamArrangement, Team, TeamMembership,
  InstrumentTemplate, Assessment, InstrumentSnapshot,
  StudentAssessmentResult, CriterionScore
} from '../types'

export class CuadernoDb extends Dexie {
  academicYears!: Table<AcademicYear, number>
  classGroups!: Table<ClassGroup, number>
  students!: Table<Student, number>
  enrollments!: Table<Enrollment, number>
  subjects!: Table<Subject, number>
  studentNotes!: Table<StudentNote, number>
  checklists!: Table<ChecklistSession, number>
  checklistEntries!: Table<ChecklistEntry, number>
  teamArrangements!: Table<TeamArrangement, number>
  teams!: Table<Team, number>
  teamMemberships!: Table<TeamMembership, number>
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

    // v3 - student notes and team work support
    this.version(3).stores({
      academicYears:   '++id, name, isActive, syncStatus',
      classGroups:     '++id, yearId, name, syncStatus',
      students:        '++id, displayName, syncStatus',
      enrollments:     '++id, studentId, groupId, yearId, [studentId+groupId]',
      subjects:        '++id, yearId, name, syncStatus',
      studentNotes:    '++id, studentId, subjectId, groupId, noteType, isResolved, createdAt, updatedAt',
      teamArrangements:'++id, groupId, yearId, name, isArchived, updatedAt, syncStatus',
      teams:           '++id, groupId, yearId, name, isArchived, updatedAt, syncStatus',
      teamMemberships: '++id, teamId, studentId, [teamId+studentId]',
      templates:       '++id, title, source, syncStatus, updatedAt',
      assessments:     '++id, groupId, subjectId, templateId, snapshotId, status, date, updatedAt, syncStatus',
      snapshots:       '++id, templateId, assessmentId',
      results:         '++id, assessmentId, studentId, status, syncStatus, updatedAt, [assessmentId+studentId]',
      criterionScores: '++id, resultId, criterionId, [resultId+criterionId]',
    })

    // v4 - grouping arrangements and arrangement-aware teams/assessments
    this.version(4).stores({
      academicYears:   '++id, name, isActive, syncStatus',
      classGroups:     '++id, yearId, name, syncStatus',
      students:        '++id, displayName, syncStatus',
      enrollments:     '++id, studentId, groupId, yearId, [studentId+groupId]',
      subjects:        '++id, yearId, name, syncStatus',
      studentNotes:    '++id, studentId, subjectId, groupId, noteType, isResolved, createdAt, updatedAt',
      teamArrangements:'++id, groupId, yearId, name, isArchived, updatedAt, syncStatus',
      teams:           '++id, groupId, yearId, arrangementId, name, isArchived, updatedAt, syncStatus',
      teamMemberships: '++id, teamId, studentId, [teamId+studentId]',
      templates:       '++id, title, source, syncStatus, updatedAt',
      assessments:     '++id, groupId, subjectId, teamArrangementId, templateId, snapshotId, status, date, updatedAt, syncStatus',
      snapshots:       '++id, templateId, assessmentId',
      results:         '++id, assessmentId, studentId, status, syncStatus, updatedAt, [assessmentId+studentId]',
      criterionScores: '++id, resultId, criterionId, [resultId+criterionId]',
    })
      .upgrade(async tx => {
        const now = Date.now()
        const groups = await tx.table('classGroups').toArray() as Array<{ id?: number; yearId: number }>
        const arrangementsTable = tx.table('teamArrangements')
        const teamsTable = tx.table('teams')

        const arrangementByGroup = new Map<number, number>()
        for (const group of groups) {
          if (!group.id) continue
          const existing = await arrangementsTable
            .where('groupId')
            .equals(group.id)
            .first() as { id?: number } | undefined
          if (existing?.id) {
            arrangementByGroup.set(group.id, existing.id)
            continue
          }

          const arrangementId = await arrangementsTable.add({
            groupId: group.id,
            yearId: group.yearId,
            name: 'Mesas base',
            isArchived: false,
            deviceId: 'local',
            syncStatus: 'pending',
            updatedAt: now,
          } as TeamArrangement)
          arrangementByGroup.set(group.id, Number(arrangementId))
        }

        await teamsTable.toCollection().modify((team: Team) => {
          if (team.arrangementId !== undefined && team.arrangementId !== null) return
          const arrangementId = arrangementByGroup.get(team.groupId)
          team.arrangementId = arrangementId ?? null
          team.updatedAt = now
        })

        await tx.table('assessments').toCollection().modify((assessment: Assessment) => {
          if (assessment.teamArrangementId !== undefined) return
          assessment.teamArrangementId = null
          assessment.updatedAt = now
        })
      })

    // v5 - classroom checklists (attendance/authorizations/custom)
    this.version(5).stores({
      academicYears:   '++id, name, isActive, syncStatus',
      classGroups:     '++id, yearId, name, syncStatus',
      students:        '++id, displayName, syncStatus',
      enrollments:     '++id, studentId, groupId, yearId, [studentId+groupId]',
      subjects:        '++id, yearId, name, syncStatus',
      studentNotes:    '++id, studentId, subjectId, groupId, noteType, isResolved, createdAt, updatedAt',
      checklists:      '++id, groupId, yearId, subjectId, kind, date, updatedAt, syncStatus, [groupId+date]',
      checklistEntries:'++id, sessionId, studentId, value, updatedAt, [sessionId+studentId]',
      teamArrangements:'++id, groupId, yearId, name, isArchived, updatedAt, syncStatus',
      teams:           '++id, groupId, yearId, arrangementId, name, isArchived, updatedAt, syncStatus',
      teamMemberships: '++id, teamId, studentId, [teamId+studentId]',
      templates:       '++id, title, source, syncStatus, updatedAt',
      assessments:     '++id, groupId, subjectId, teamArrangementId, templateId, snapshotId, status, date, updatedAt, syncStatus',
      snapshots:       '++id, templateId, assessmentId',
      results:         '++id, assessmentId, studentId, status, syncStatus, updatedAt, [assessmentId+studentId]',
      criterionScores: '++id, resultId, criterionId, [resultId+criterionId]',
    })
  }
}

export const db = new CuadernoDb()
