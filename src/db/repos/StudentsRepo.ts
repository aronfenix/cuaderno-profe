import { db } from '../schema'
import type { Student, Enrollment } from '../../types'
import { getDeviceId } from './deviceId'

export const StudentsRepo = {
  async getAll(): Promise<Student[]> {
    return db.students.orderBy('displayName').toArray()
  },

  async getById(id: number): Promise<Student | undefined> {
    return db.students.get(id)
  },

  async getByGroup(groupId: number): Promise<Student[]> {
    const enrollments = await db.enrollments.where('groupId').equals(groupId).toArray()
    const studentIds = enrollments.map(e => e.studentId)
    return db.students.where('id').anyOf(studentIds).sortBy('displayName')
  },

  async create(displayName: string): Promise<number> {
    return db.students.add({
      displayName,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async update(id: number, displayName: string): Promise<void> {
    await db.students.update(id, {
      displayName,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async delete(id: number): Promise<void> {
    await db.transaction('rw', db.students, db.enrollments, async () => {
      await db.enrollments.where('studentId').equals(id).delete()
      await db.students.delete(id)
    })
  },

  async enroll(studentId: number, groupId: number, yearId: number): Promise<void> {
    const existing = await db.enrollments
      .where('[studentId+groupId]' as never)
      .equals([studentId, groupId] as never)
      .first()
    if (!existing) {
      await db.enrollments.add({ studentId, groupId, yearId, syncStatus: 'pending', updatedAt: Date.now() })
    }
  },

  async unenroll(studentId: number, groupId: number): Promise<void> {
    await db.enrollments
      .where('studentId').equals(studentId)
      .and(e => e.groupId === groupId)
      .delete()
  },

  async bulkCreate(names: string[], groupId: number, yearId: number): Promise<void> {
    await db.transaction('rw', db.students, db.enrollments, async () => {
      for (const name of names) {
        const id = await db.students.add({
          displayName: name,
          deviceId: getDeviceId(),
          syncStatus: 'pending',
          updatedAt: Date.now(),
        })
        await db.enrollments.add({ studentId: id as number, groupId, yearId, syncStatus: 'pending', updatedAt: Date.now() })
      }
    })
  }
}
