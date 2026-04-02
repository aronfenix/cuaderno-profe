import { db } from '../schema'
import type { AcademicYear, ClassGroup, Subject } from '../../types'
import { getDeviceId } from './deviceId'

export const GroupsRepo = {
  // ── Academic Years ──────────────────────────────────────────────────────────

  async getAllYears(): Promise<AcademicYear[]> {
    return db.academicYears.orderBy('name').reverse().toArray()
  },

  async getActiveYear(): Promise<AcademicYear | undefined> {
    const active = await db.academicYears.where('isActive').equals(1).first()
    if (active) return active

    const years = await db.academicYears.toArray()
    return years.sort((a, b) => b.updatedAt - a.updatedAt || b.name.localeCompare(a.name))[0]
  },

  async getResolvedActiveYear(): Promise<AcademicYear | undefined> {
    const year = await this.getActiveYear()
    if (year?.id === undefined) return year

    if (!year.isActive) {
      await db.academicYears.toCollection().modify({ isActive: false })
      await db.academicYears.update(year.id, { isActive: true, updatedAt: Date.now() })
      return { ...year, isActive: true }
    }

    return year
  },

  async createYear(name: string): Promise<number> {
    // Deactivate all, then create new active one
    await db.academicYears.toCollection().modify({ isActive: false })
    return db.academicYears.add({
      name,
      isActive: true,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async setActiveYear(id: number): Promise<void> {
    await db.academicYears.toCollection().modify({ isActive: false })
    await db.academicYears.update(id, { isActive: true, updatedAt: Date.now() })
  },

  // ── Class Groups ────────────────────────────────────────────────────────────

  async getGroupsByYear(yearId: number): Promise<ClassGroup[]> {
    return db.classGroups.where('yearId').equals(yearId).sortBy('name')
  },

  async getAllGroups(): Promise<ClassGroup[]> {
    return db.classGroups.orderBy('name').toArray()
  },

  async createGroup(name: string, yearId: number): Promise<number> {
    return db.classGroups.add({
      name,
      yearId,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async updateGroup(id: number, name: string): Promise<void> {
    await db.classGroups.update(id, { name, syncStatus: 'pending', updatedAt: Date.now() })
  },

  async deleteGroup(id: number): Promise<void> {
    await db.classGroups.delete(id)
  },

  // ── Subjects ────────────────────────────────────────────────────────────────

  async getSubjectsByYear(yearId: number): Promise<Subject[]> {
    return db.subjects.where('yearId').equals(yearId).sortBy('name')
  },

  async getAllSubjects(): Promise<Subject[]> {
    return db.subjects.orderBy('name').toArray()
  },

  async createSubject(name: string, yearId: number): Promise<number> {
    return db.subjects.add({
      name,
      yearId,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async updateSubject(id: number, name: string): Promise<void> {
    await db.subjects.update(id, { name, syncStatus: 'pending', updatedAt: Date.now() })
  },

  async deleteSubject(id: number): Promise<void> {
    await db.subjects.delete(id)
  },
}
