import { db } from '../schema'
import type { StudentAssessmentResult, CriterionScore, Score } from '../../types'
import { getDeviceId } from './deviceId'

export const ResultsRepo = {
  async getOrCreate(assessmentId: number, studentId: number): Promise<StudentAssessmentResult> {
    const existing = await db.results
      .where('[assessmentId+studentId]')
      .equals([assessmentId, studentId])
      .first()

    if (existing) return existing

    const id = await db.results.add({
      assessmentId,
      studentId,
      status: 'pending',
      finalGrade: null,
      comment: '',
      completedAt: null,
      deviceId: getDeviceId(),
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
    return db.results.get(id as number) as Promise<StudentAssessmentResult>
  },

  async getById(id: number): Promise<StudentAssessmentResult | undefined> {
    return db.results.get(id)
  },

  async getAllForAssessment(assessmentId: number): Promise<StudentAssessmentResult[]> {
    return db.results.where('assessmentId').equals(assessmentId).toArray()
  },

  async upsertScore(resultId: number, criterionId: string, score: Score): Promise<void> {
    const existing = await db.criterionScores
      .where('[resultId+criterionId]')
      .equals([resultId, criterionId])
      .first()

    const now = Date.now()
    if (existing?.id !== undefined) {
      await db.criterionScores.update(existing.id, { score, updatedAt: now })
    } else {
      await db.criterionScores.add({ resultId, criterionId, score, updatedAt: now })
    }

    // Ensure result is marked in_progress (won't downgrade completed)
    const result = await db.results.get(resultId)
    if (result && result.status === 'pending') {
      await db.results.update(resultId, { status: 'in_progress', syncStatus: 'pending', updatedAt: now })
    } else {
      await db.results.update(resultId, { syncStatus: 'pending', updatedAt: now })
    }
  },

  async getScoresForResult(resultId: number): Promise<CriterionScore[]> {
    return db.criterionScores.where('resultId').equals(resultId).toArray()
  },

  async finalize(resultId: number, finalGrade: number | null, comment: string): Promise<void> {
    const now = Date.now()
    await db.results.update(resultId, {
      finalGrade,
      comment,
      status: finalGrade !== null ? 'completed' : 'in_progress',
      completedAt: finalGrade !== null ? now : null,
      syncStatus: 'pending',
      updatedAt: now,
    })
  },

  async reopen(resultId: number): Promise<void> {
    await db.results.update(resultId, {
      status: 'in_progress',
      finalGrade: null,
      completedAt: null,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    })
  },

  async updateComment(resultId: number, comment: string): Promise<void> {
    await db.results.update(resultId, { comment, syncStatus: 'pending', updatedAt: Date.now() })
  },

  async getScoreMap(resultId: number): Promise<Map<string, Score>> {
    const scores = await db.criterionScores.where('resultId').equals(resultId).toArray()
    return new Map(scores.map(s => [s.criterionId, s.score]))
  }
}
