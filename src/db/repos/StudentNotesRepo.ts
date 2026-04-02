import { db } from '../schema'
import type { StudentNote, StudentNoteType } from '../../types'
import { getDeviceId } from './deviceId'

export const StudentNotesRepo = {
  async getByStudent(studentId: number): Promise<StudentNote[]> {
    return db.studentNotes
      .where('studentId')
      .equals(studentId)
      .reverse()
      .sortBy('createdAt')
  },

  async create(data: {
    studentId: number
    subjectId?: number | null
    groupId?: number | null
    noteType: StudentNoteType
    text: string
  }): Promise<number> {
    const now = Date.now()
    return db.studentNotes.add({
      studentId: data.studentId,
      subjectId: data.subjectId ?? null,
      groupId: data.groupId ?? null,
      noteType: data.noteType,
      text: data.text.trim(),
      isResolved: false,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, patch: Partial<Pick<StudentNote, 'text' | 'subjectId' | 'groupId' | 'noteType'>>): Promise<void> {
    await db.studentNotes.update(id, {
      ...patch,
      text: patch.text?.trim(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async toggleResolved(id: number, isResolved: boolean): Promise<void> {
    await db.studentNotes.update(id, {
      isResolved,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async delete(id: number): Promise<void> {
    await db.studentNotes.delete(id)
  },
}
