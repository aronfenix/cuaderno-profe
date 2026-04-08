import type { Criterion, CriterionScore, RoundingMode, GradeCalculationResult } from '../types'

function isBonusCriterion(criterion: Criterion): boolean {
  return typeof criterion.bonusMaxPoints === 'number' && criterion.bonusMaxPoints > 0
}

function bonusFromScore(score: number, bonusMaxPoints: number): number {
  const normalized = (score - 1) / 4 // 1->0, 5->1
  return Math.max(0, Math.min(1, normalized)) * bonusMaxPoints
}

export function calculateGrade(
  criteria: Criterion[],
  scores: CriterionScore[],
  rounding: RoundingMode = '0.1'
): GradeCalculationResult {
  const scoreMap = new Map(scores.map(s => [s.criterionId, s.score]))
  const weightedCriteria = criteria.filter(criterion => !isBonusCriterion(criterion))
  const bonusCriteria = criteria.filter(isBonusCriterion)

  // Step 1: Separate scored from N/A in weighted criteria only
  const scored = weightedCriteria.filter(c => {
    const s = scoreMap.get(c.id)
    return s !== null && s !== undefined
  })

  const naCount = weightedCriteria.length - scored.length

  // Step 2: All weighted criteria N/A -> grade = null
  if (scored.length === 0) {
    return { avg1to5: null, grade1to10: null, bonusPoints: 0, naCount, totalCount: weightedCriteria.length }
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

  // Step 6: Optional additive bonus criteria (never penalize)
  const bonusPoints = bonusCriteria.reduce((acc, criterion) => {
    const score = scoreMap.get(criterion.id)
    if (score === null || score === undefined) return acc
    if (typeof criterion.bonusMaxPoints !== 'number' || criterion.bonusMaxPoints <= 0) return acc
    return acc + bonusFromScore(score, criterion.bonusMaxPoints)
  }, 0)

  const withBonus = Math.min(10, raw1to10 + bonusPoints)

  // Step 7: Apply rounding
  const grade1to10 = applyRounding(withBonus, rounding)

  return { avg1to5, grade1to10, bonusPoints, naCount, totalCount: weightedCriteria.length }
}

function applyRounding(value: number, mode: RoundingMode): number {
  switch (mode) {
    case '1':   return Math.round(value)
    case '0.5': return Math.round(value * 2) / 2
    case '0.1': return Math.round(value * 10) / 10
  }
}

export function formatGrade(grade: number | null): string {
  if (grade === null) return '-'
  return grade.toFixed(1).replace('.0', '')
}

export function gradeColor(grade: number | null): string {
  if (grade === null) return 'var(--color-muted)'
  if (grade >= 9) return 'var(--color-excellent)'
  if (grade >= 7) return 'var(--color-good)'
  if (grade >= 5) return 'var(--color-pass)'
  return 'var(--color-fail)'
}
