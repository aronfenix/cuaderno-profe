import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../db/schema'
import { ResultsRepo } from '../db/repos/ResultsRepo'
import { AssessmentsRepo } from '../db/repos/AssessmentsRepo'
import { calculateGrade } from '../lib/gradeCalculator'
import type { Score, RoundingMode, GradeCalculationResult } from '../types'

export function useGrading(assessmentId: number, studentId: number) {
  const saveInFlight = useRef(false)
  const [resultId, setResultId] = useState<number | null>(null)
  const initRef = useRef(false)

  // Create-or-get the result row ONCE imperatively (NOT inside useLiveQuery).
  // Writing inside a useLiveQuery callback causes infinite reactive loops.
  useEffect(() => {
    if (initRef.current || !assessmentId || !studentId) return
    initRef.current = true
    ResultsRepo.getOrCreate(assessmentId, studentId)
      .then(r => { if (r.id !== undefined) setResultId(r.id) })
      .catch(console.error)
  }, [assessmentId, studentId])

  // Reactively observe the result row by ID
  const result = useLiveQuery(
    () => resultId !== null ? db.results.get(resultId) : undefined,
    [resultId]
  )

  // Reactively observe criterion scores
  const scores = useLiveQuery(
    (): Promise<import('../types').CriterionScore[]> => resultId !== null
      ? db.criterionScores.where('resultId').equals(resultId).toArray()
      : Promise.resolve([]),
    [resultId]
  )

  // Observe the snapshot (pure read, always safe)
  const snapshot = useLiveQuery(
    () => AssessmentsRepo.getSnapshot(assessmentId),
    [assessmentId]
  )

  const saveScore = useCallback(async (criterionId: string, score: Score) => {
    if (resultId === null || saveInFlight.current) return
    saveInFlight.current = true
    try {
      await ResultsRepo.upsertScore(resultId, criterionId, score)
    } finally {
      saveInFlight.current = false
    }
  }, [resultId])

  const gradeResult: GradeCalculationResult | null = (() => {
    if (!snapshot?.data?.criteria || !scores) return null
    const rounding: RoundingMode = snapshot.data.finalGrade?.rounding ?? '0.1'
    return calculateGrade(snapshot.data.criteria, scores, rounding)
  })()

  const finalize = useCallback(async (comment: string) => {
    if (resultId === null) return
    const grade = gradeResult?.grade1to10 ?? null
    await ResultsRepo.finalize(resultId, grade, comment)
  }, [resultId, gradeResult])

  const reopen = useCallback(async () => {
    if (resultId === null) return
    await ResultsRepo.reopen(resultId)
  }, [resultId])

  return {
    result,
    scores: scores ?? [],
    snapshot,
    saveScore,
    finalize,
    reopen,
    gradeResult,
    isLoading: resultId === null || result === undefined || snapshot === undefined
  }
}
