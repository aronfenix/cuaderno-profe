import type { Criterion, CriterionScore, RoundingMode, GradeCalculationResult } from '../types'

export function calculateGrade(
  criteria: Criterion[],
  scores: CriterionScore[],
  rounding: RoundingMode = '0.1'
): GradeCalculationResult {
  const scoreMap = new Map(scores.map(s => [s.criterionId, s.score]))

  // Step 1: Separate scored from N/A
  const scored = criteria.filter(c => {
    const s = scoreMap.get(c.id)
    return s !== null && s !== undefined
  })

  const naCount = criteria.length - scored.length

  // Step 2: All N/A → grade = null
  if (scored.length === 0) {
    return { avg1to5: null, grade1to10: null, naCount, totalCount: criteria.length }
  }

  // Step 3: Re-normalize weights to sum = 1
  const totalWeight = scored.reduce((acc, c) => acc + c.weight, 0)
  const normalizedWeights = scored.map(c => c.weight / totalWeight)

  // Step 4: Weighted average (1..5 scale)
  const avg1to5 = scored.reduce((acc, c, i) => {
    const score = scoreMap.get(c.id) as number
    return acc + score * normalizedWeights[i]
  }, 0)

  // Step 5: Map to 1..10
  const raw1to10 = avg1to5 * 2

  // Step 6: Apply rounding
  const grade1to10 = applyRounding(raw1to10, rounding)

  return { avg1to5, grade1to10, naCount, totalCount: criteria.length }
}

function applyRounding(value: number, mode: RoundingMode): number {
  switch (mode) {
    case '1':   return Math.round(value)
    case '0.5': return Math.round(value * 2) / 2
    case '0.1': return Math.round(value * 10) / 10
  }
}

export function formatGrade(grade: number | null): string {
  if (grade === null) return '—'
  return grade.toFixed(1).replace('.0', '')
}

export function gradeColor(grade: number | null): string {
  if (grade === null) return 'var(--color-muted)'
  if (grade >= 9) return 'var(--color-excellent)'
  if (grade >= 7) return 'var(--color-good)'
  if (grade >= 5) return 'var(--color-pass)'
  return 'var(--color-fail)'
}
