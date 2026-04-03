import { db } from '../schema'
import type { ChecklistEntry, ChecklistSession, ChecklistValue, Student } from '../../types'
import { getDeviceId } from './deviceId'

export interface ChecklistEntryWithStudent extends ChecklistEntry {
  studentName: string
}

export const ChecklistsRepo = {
  async getByGroup(groupId: number): Promise<ChecklistSession[]> {
    const items = await db.checklists.where('groupId').equals(groupId).toArray()
    return items.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.updatedAt - a.updatedAt
    })
  },

  async getById(id: number): Promise<ChecklistSession | undefined> {
    return db.checklists.get(id)
  },

  async createSession(input: {
    title: string
    kind: ChecklistSession['kind']
    date: string
    yearId: number
    groupId: number
    subjectId: number | null
  }): Promise<number> {
    const now = Date.now()
    const deviceId = getDeviceId()

    return db.transaction('rw', db.checklists, db.checklistEntries, db.enrollments, async () => {
      const sessionId = await db.checklists.add({
        title: input.title.trim(),
        kind: input.kind,
        date: input.date,
        yearId: input.yearId,
        groupId: input.groupId,
        subjectId: input.subjectId,
        deviceId,
        syncStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      })

      const enrollments = await db.enrollments.where('groupId').equals(input.groupId).toArray()
      const studentIds = [...new Set(enrollments.map(enrollment => enrollment.studentId))]
      if (studentIds.length) {
        await db.checklistEntries.bulkAdd(
          studentIds.map(studentId => ({
            sessionId: Number(sessionId),
            studentId,
            value: 'na' as ChecklistValue,
            comment: '',
            deviceId,
            syncStatus: 'pending' as const,
            updatedAt: now,
          }))
        )
      }

      return Number(sessionId)
    })
  },

  async deleteSession(id: number): Promise<void> {
    await db.transaction('rw', db.checklists, db.checklistEntries, async () => {
      await db.checklistEntries.where('sessionId').equals(id).delete()
      await db.checklists.delete(id)
    })
  },

  async getEntries(sessionId: number): Promise<ChecklistEntryWithStudent[]> {
    const entries = await db.checklistEntries.where('sessionId').equals(sessionId).toArray()
    if (!entries.length) return []

    const students = await db.students.where('id').anyOf(entries.map(entry => entry.studentId)).toArray()
    const studentMap = new Map<number, Student>(students.map(student => [student.id!, student]))

    return entries
      .map(entry => ({
        ...entry,
        studentName: studentMap.get(entry.studentId)?.displayName ?? 'Alumno',
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'es'))
  },

  async setEntryValue(entryId: number, value: ChecklistValue): Promise<void> {
    const now = Date.now()
    const entry = await db.checklistEntries.get(entryId)
    if (!entry) return

    await db.transaction('rw', db.checklistEntries, db.checklists, async () => {
      await db.checklistEntries.update(entryId, {
        value,
        syncStatus: 'pending',
        updatedAt: now,
      })
      await db.checklists.update(entry.sessionId, {
        syncStatus: 'pending',
        updatedAt: now,
      })
    })
  },

  async setEntryComment(entryId: number, comment: string): Promise<void> {
    const now = Date.now()
    const entry = await db.checklistEntries.get(entryId)
    if (!entry) return

    await db.transaction('rw', db.checklistEntries, db.checklists, async () => {
      await db.checklistEntries.update(entryId, {
        comment: comment.trim(),
        syncStatus: 'pending',
        updatedAt: now,
      })
      await db.checklists.update(entry.sessionId, {
        syncStatus: 'pending',
        updatedAt: now,
      })
    })
  },

  async setAllValues(sessionId: number, value: ChecklistValue): Promise<void> {
    const now = Date.now()
    await db.transaction('rw', db.checklistEntries, db.checklists, async () => {
      await db.checklistEntries.where('sessionId').equals(sessionId).modify({
        value,
        syncStatus: 'pending',
        updatedAt: now,
      })
      await db.checklists.update(sessionId, {
        syncStatus: 'pending',
        updatedAt: now,
      })
    })
  },
}
