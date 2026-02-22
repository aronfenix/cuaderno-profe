import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAssessmentDetail } from '../hooks/useAssessment'
import { formatGrade, gradeColor } from '../lib/gradeCalculator'
import type { StudentAssessmentResult } from '../types'

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>()
  const assessmentId = Number(id)
  const navigate = useNavigate()
  const { assessment, snapshot, students, results, subject, group, isLoading } = useAssessmentDetail(assessmentId)

  if (isLoading) return <div className="loading-page"><div className="spinner" /></div>
  if (!assessment) return <div className="page"><p>Evaluación no encontrada.</p></div>

  const resultMap = new Map(results.map(r => [r.studentId, r]))

  const statusCounts = {
    completed: results.filter(r => r.status === 'completed').length,
    in_progress: results.filter(r => r.status === 'in_progress').length,
    pending: students.length - results.filter(r => r.status !== 'pending').length,
  }

  return (
    <div className="page" style={{ paddingTop: 'var(--s-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
        <button className="btn-icon" onClick={() => navigate('/assessments')}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>{assessment.title}</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '2px' }}>
            {group?.name} · {subject?.name} · {new Date(assessment.date).toLocaleDateString('es-ES')}
          </p>
        </div>
        <Link to={`/assessments/${assessmentId}/results`} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
          Resultados
        </Link>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s-2)' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>Progreso</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {statusCounts.completed}/{students.length}
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${students.length ? (statusCounts.completed / students.length * 100) : 0}%`,
            background: 'var(--color-success)',
            borderRadius: 'var(--r-full)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--s-4)', marginTop: 'var(--s-2)' }}>
          <span className="badge badge-done">✓ {statusCounts.completed}</span>
          <span className="badge badge-progress">⏳ {statusCounts.in_progress}</span>
          <span className="badge badge-pending">○ {statusCounts.pending}</span>
        </div>
      </div>

      {/* Student list */}
      <div className="list">
        {students.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">Sin alumnos en este grupo</div>
          </div>
        )}
        {students.map(student => {
          const result = resultMap.get(student.id!)
          const status = result?.status ?? 'pending'
          return (
            <Link
              key={student.id}
              to={`/assessments/${assessmentId}/grade/${student.id}`}
              className="list-item"
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: statusBg(status), color: statusColor(status),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0
                }}>
                  {statusIcon(status)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.displayName}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                    {statusLabel(status)}
                  </div>
                </div>
              </div>
              {result?.finalGrade !== null && result?.finalGrade !== undefined && (
                <div style={{
                  fontSize: '1.25rem', fontWeight: 800, minWidth: 48, textAlign: 'right',
                  color: gradeColor(result.finalGrade)
                }}>
                  {formatGrade(result.finalGrade)}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function statusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✓'
    case 'in_progress': return '…'
    default: return '○'
  }
}
function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Completado'
    case 'in_progress': return 'En progreso'
    default: return 'Sin evaluar'
  }
}
function statusBg(status: string): string {
  switch (status) {
    case 'completed': return 'var(--color-success-light)'
    case 'in_progress': return 'var(--color-warning-light)'
    default: return 'var(--color-surface-2)'
  }
}
function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'var(--color-success)'
    case 'in_progress': return 'var(--color-warning)'
    default: return 'var(--color-muted)'
  }
}
