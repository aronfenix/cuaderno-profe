import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useGrading } from '../hooks/useGrading'
import { DescriptorModal } from '../components/rubric/DescriptorModal'
import { db } from '../db/schema'
import { TeamsRepo } from '../db/repos/TeamsRepo'
import { ResultsRepo } from '../db/repos/ResultsRepo'
import type { Criterion, Score } from '../types'
import { formatGrade } from '../lib/gradeCalculator'
import '../styles/grade-screen.css'

const QUICK_PHRASES = [
  'Buen trabajo', 'Necesita mejorar', 'Muy participativo/a',
  'Falta profundidad', 'Excelente presentación', 'Buena actitud',
]

export function GradeScreen() {
  const { id, studentId } = useParams<{ id: string; studentId: string }>()
  const navigate = useNavigate()
  const assessmentId = Number(id)
  const studentIdNum = Number(studentId)

  const [showComment, setShowComment] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [descriptorCriterion, setDescriptorCriterion] = useState<Criterion | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [applyingTeam, setApplyingTeam] = useState(false)
  const criterionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const student = useLiveQuery(() => db.students.get(studentIdNum), [studentIdNum])
  const assessment = useLiveQuery(() => db.assessments.get(assessmentId), [assessmentId])

  const team = useLiveQuery(
    async () => {
      if (!assessment?.teamArrangementId) return undefined
      return TeamsRepo.getTeamByStudentInArrangement(assessment.teamArrangementId, studentIdNum)
    },
    [assessment?.teamArrangementId, studentIdNum]
  )

  const teamMembers = useLiveQuery(
    async () => {
      if (!team?.id) return []
      return TeamsRepo.getMembers(team.id)
    },
    [team?.id]
  )

  // Find next student for quick navigation
  const nextStudentId = useLiveQuery(async () => {
    if (!assessmentId) return null
    const assessment = await db.assessments.get(assessmentId)
    if (!assessment?.groupId) return null
    const enrollments = await db.enrollments.where('groupId').equals(assessment.groupId).toArray()
    const studentIds = enrollments.map(e => e.studentId).sort((a, b) => a - b)
    const results = await db.results.where('assessmentId').equals(assessmentId).toArray()
    const completedIds = new Set(results.filter(r => r.status === 'completed').map(r => r.studentId))
    const currentIdx = studentIds.indexOf(studentIdNum)
    // Find next student after current that is not completed
    for (let i = currentIdx + 1; i < studentIds.length; i++) {
      if (!completedIds.has(studentIds[i])) return studentIds[i]
    }
    // Wrap around
    for (let i = 0; i < currentIdx; i++) {
      if (!completedIds.has(studentIds[i])) return studentIds[i]
    }
    return null
  }, [assessmentId, studentIdNum])

  const {
    result, scores, snapshot, saveScore, finalize, gradeResult, isLoading
  } = useGrading(assessmentId, studentIdNum)

  // Sync comment from DB when result loads
  useEffect(() => {
    if (result?.comment) setCommentText(result.comment)
  }, [result?.id])

  const criteria = snapshot?.data?.criteria ?? []
  const scoreMap = new Map(scores.map(s => [s.criterionId, s.score]))

  const answeredCount = criteria.filter(c => scoreMap.has(c.id)).length

  const handleScore = async (criterion: Criterion, score: Score, currentIndex: number) => {
    await saveScore(criterion.id, score)

    // Auto-scroll to next unanswered criterion
    const nextUnansweredIndex = criteria.findIndex(
      (c, i) => i > currentIndex && !scoreMap.has(c.id)
    )
    if (nextUnansweredIndex !== -1) {
      const el = criterionRefs.current[criteria[nextUnansweredIndex].id]
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // Haptic feedback (mobile)
    if ('vibrate' in navigator) navigator.vibrate(30)
  }

  const handleFinalize = async () => {
    if (finalizing) return
    setFinalizing(true)
    try {
      await finalize(commentText)
      navigate(`/assessments/${assessmentId}`, { replace: true })
    } finally {
      setFinalizing(false)
    }
  }

  const handleNextStudent = async () => {
    if (!nextStudentId) return
    await finalize(commentText)
    navigate(`/assessments/${assessmentId}/grade/${nextStudentId}`, { replace: true })
  }

  const handleApplyToTeam = async () => {
    if (applyingTeam || !team?.id || answeredCount === 0) return

    const members = (teamMembers ?? []).filter(member => member.id !== studentIdNum)
    if (members.length === 0) return

    const confirmed = window.confirm(`Aplicar esta evaluacion y comentario a ${members.length} alumnos del ${team.name}?`)
    if (!confirmed) return

    setApplyingTeam(true)
    try {
      const grade = gradeResult?.grade1to10 ?? null
      for (const member of members) {
        const target = await ResultsRepo.getOrCreate(assessmentId, member.id!)
        if (!target.id) continue

        for (const score of scores) {
          await ResultsRepo.upsertScore(target.id, score.criterionId, score.score)
        }

        await ResultsRepo.finalize(target.id, grade, commentText)
      }
    } finally {
      setApplyingTeam(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grade-screen">
        <div className="loading-page"><div className="spinner" /></div>
      </div>
    )
  }

  const grade = gradeResult?.grade1to10
  const isCompleted = result?.status === 'completed'
  const extraTeamMembers = (teamMembers ?? []).filter(member => member.id !== studentIdNum)

  return (
    <div className="grade-screen">
      {/* Sticky header */}
      <header className="grade-header">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Volver">
          ←
        </button>
        <div className="grade-header-center">
          <div className="grade-student-name">{student?.displayName ?? '...'}</div>
          <div className="grade-progress">
            {answeredCount}/{criteria.length} criterios
            {gradeResult?.naCount ? ` · ${gradeResult.naCount} N/A` : ''}
            {team?.name ? ` · ${team.name}` : ''}
          </div>
        </div>
        {grade !== null && grade !== undefined && (
          <div className="grade-live-score">{formatGrade(grade)}</div>
        )}
      </header>

      {/* Criteria */}
      <main className="criteria-list">
        <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-3)', flexWrap: 'wrap' }}>
          <Link to={`/students/${studentIdNum}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Ficha del alumno
          </Link>
        </div>

        {criteria.map((criterion, index) => {
          const currentScore = scoreMap.get(criterion.id)
          const hasScore = currentScore !== undefined
          const isNA = currentScore === null

          return (
            <div
              key={criterion.id}
              ref={el => { criterionRefs.current[criterion.id] = el }}
              className={`criterion-card ${hasScore && !isNA ? 'scored' : ''} ${isNA ? 'na-scored' : ''}`}
            >
              <div className="criterion-card-header">
                <h3 className="criterion-title">{criterion.titleShort}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                  <span className="criterion-index">{index + 1}/{criteria.length}</span>
                  {(criterion.helpText || criterion.descriptors[1]) && (
                    <button
                      className="btn-info"
                      onClick={() => setDescriptorCriterion(criterion)}
                      aria-label="Ver descriptores"
                    >
                      i
                    </button>
                  )}
                </div>
              </div>

              <div className="score-buttons">
                {([1, 2, 3, 4, 5] as const).map(score => (
                  <button
                    key={score}
                    data-score={score}
                    className={`score-btn ${currentScore === score ? 'active' : ''}`}
                    onClick={() => handleScore(criterion, score, index)}
                    aria-label={`Puntuación ${score}`}
                  >
                    {score}
                  </button>
                ))}
                {snapshot?.data?.scale?.allowNA !== false && (
                  <button
                    className={`score-btn score-btn-na ${currentScore === null && hasScore ? 'active' : ''}`}
                    onClick={() => handleScore(criterion, null, index)}
                    aria-label="No aplica"
                  >
                    N/A
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Comment section */}
        <div className="comment-section">
          <button className="comment-toggle" onClick={() => setShowComment(v => !v)}>
            {showComment ? '▲ Ocultar comentario' : '▼ Añadir comentario'}
          </button>
          {showComment && (
            <>
              <textarea
                className="form-textarea"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Observaciones sobre este alumno..."
                rows={3}
                style={{ marginTop: 'var(--s-2)' }}
              />
              <div className="quick-phrases">
                {QUICK_PHRASES.map(phrase => (
                  <button
                    key={phrase}
                    className="chip"
                    onClick={() => setCommentText(prev =>
                      prev ? `${prev}. ${phrase}` : phrase
                    )}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="grade-footer">
        {team?.name && extraTeamMembers.length > 0 && (
          <button
            className="btn btn-secondary btn-large"
            onClick={handleApplyToTeam}
            disabled={applyingTeam || answeredCount === 0}
            style={{ marginBottom: 'var(--s-2)' }}
          >
            {applyingTeam
              ? 'Aplicando al equipo...'
              : `Aplicar a ${extraTeamMembers.length} companeros de ${team.name}`}
          </button>
        )}

        {isCompleted && nextStudentId && (
          <button
            className="btn btn-secondary btn-large"
            onClick={handleNextStudent}
            style={{ marginBottom: 'var(--s-2)' }}
          >
            Siguiente alumno →
          </button>
        )}
        <button
          className="btn btn-primary btn-large"
          onClick={handleFinalize}
          disabled={finalizing || answeredCount === 0}
        >
          {finalizing ? 'Guardando...' : (
            isCompleted
              ? `✓ Completado · ${formatGrade(grade ?? null)}/10`
              : `Finalizar${grade !== null && grade !== undefined ? ` · ${formatGrade(grade)}/10` : ''}`
          )}
        </button>
      </footer>

      {/* Descriptor modal */}
      {descriptorCriterion && (
        <DescriptorModal
          criterion={descriptorCriterion}
          currentScore={scoreMap.get(descriptorCriterion.id)}
          onClose={() => setDescriptorCriterion(null)}
        />
      )}
    </div>
  )
}
