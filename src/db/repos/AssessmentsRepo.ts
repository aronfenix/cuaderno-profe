import { db } from '../schema'
import type { Assessment, InstrumentSnapshot } from '../../types'
import { getDeviceId } from './deviceId'

export const AssessmentsRepo = {
  async getAll(): Promise<Assessment[]> {
    return db.assessments.orderBy('date').reverse().toArray()
  },

  async getByGroup(groupId: number): Promise<Assessment[]> {
    return db.assessments.where('groupId').equals(groupId).reverse().sortBy('date')
  },

  async getById(id: number): Promise<Assessment | undefined> {
    return db.assessments.get(id)
  },

  async create(data: {
    title: string
    date: string
    groupId: number
    subjectId: number
    teamArrangementId?: number | null
    templateId: number
  }): Promise<{ assessmentId: number; snapshotId: number }> {
    const template = await db.templates.get(data.templateId)
    if (!template) throw new Error('Template not found')

    return db.transaction('rw', db.assessments, db.snapshots, async () => {
      // Create snapshot (frozen copy of template)
      const snapshotId = await db.snapshots.add({
        templateId: data.templateId,
        assessmentId: 0, // will be updated below
        data: { ...template },
        createdAt: Date.now(),
      })

      const assessmentId = await db.assessments.add({
        ...data,
        teamArrangementId: data.teamArrangementId ?? null,
        snapshotId: snapshotId as number,
        status: 'active',
        deviceId: getDeviceId(),
        syncStatus: 'pending',
        updatedAt: Date.now(),
      })

      // Update snapshot with correct assessmentId
      await db.snapshots.update(snapshotId as number, { assessmentId: assessmentId as number })

      return { assessmentId: assessmentId as number, snapshotId: snapshotId as number }
    })
  },

  async updateStatus(id: number, status: Assessment['status']): Promise<void> {
    await db.assessments.update(id, { status, syncStatus: 'pending', updatedAt: Date.now() })
  },

  async updateTeamArrangement(id: number, teamArrangementId: number | null): Promise<void> {
    await db.assessments.update(id, {
      teamArrangementId,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async delete(id: number): Promise<void> {
    await db.transaction('rw', db.assessments, db.snapshots, db.results, db.criterionScores, async () => {
      const assessment = await db.assessments.get(id)
      if (!assessment) return
      const results = await db.results.where('assessmentId').equals(id).toArray()
      for (const r of results) {
        if (r.id !== undefined) {
          await db.criterionScores.where('resultId').equals(r.id).delete()
        }
      }
      await db.results.where('assessmentId').equals(id).delete()
      await db.snapshots.where('assessmentId').equals(id).delete()
      await db.assessments.delete(id)
    })
  },

  async getSnapshot(assessmentId: number): Promise<InstrumentSnapshot | undefined> {
    return db.snapshots.where('assessmentId').equals(assessmentId).first()
  },
}
