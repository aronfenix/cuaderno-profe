import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { useAssessmentDetail } from '../hooks/useAssessment'
import { AssessmentsRepo } from '../db/repos/AssessmentsRepo'
import { TeamsRepo } from '../db/repos/TeamsRepo'
import { formatGrade, gradeColor } from '../lib/gradeCalculator'
import type { TeamArrangement } from '../types'

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>()
  const assessmentId = Number(id)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const { assessment, students, results, subject, group, isLoading } = useAssessmentDetail(assessmentId)
  const arrangements = useLiveQuery(
    () => assessment?.groupId
      ? db.teamArrangements
        .where('groupId')
        .equals(assessment.groupId)
        .and(arrangement => !arrangement.isArchived)
        .sortBy('name')
      : Promise.resolve([] as TeamArrangement[]),
    [assessment?.groupId]
  )
  const teamByStudent = useLiveQuery(
    () => assessment?.teamArrangementId
      ? TeamsRepo.getTeamMapForArrangement(assessment.teamArrangementId)
      : Promise.resolve(new Map<number, Awaited<ReturnType<typeof TeamsRepo.getByGroup>>[number]>()),
    [assessment?.teamArrangementId]
  )

  if (isLoading) return <div className="loading-page"><div className="spinner" /></div>
  if (!assessment) return <div className="page"><p>Evaluacion no encontrada.</p></div>

  const resultMap = new Map(results.map(result => [result.studentId, result]))
  const teamMap = teamByStudent ?? new Map<number, Awaited<ReturnType<typeof TeamsRepo.getByGroup>>[number]>()
  const teamOptions = Array.from(
    new Map(Array.from(teamMap.values()).map(team => [team.id!, team])).values()
  ).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const filteredStudents = students.filter(student => {
    const matchesName = student.displayName.toLowerCase().includes(search.trim().toLowerCase())
    if (!matchesName) return false

    if (teamFilter === 'all') return true
    if (teamFilter === 'none') return !teamMap.has(student.id!)
    return String(teamMap.get(student.id!)?.id) === teamFilter
  })

  const statusCounts = {
    completed: results.filter(result => result.status === 'completed').length,
    inProgress: results.filter(result => result.status === 'in_progress').length,
    pending: Math.max(
      students.length
      - results.filter(result => result.status === 'completed').length
      - results.filter(result => result.status === 'in_progress').length,
      0
    ),
  }

  return (
    <div className="page" style={{ paddingTop: 'var(--s-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
        <button className="btn-icon" onClick={() => navigate('/assessments')}>{'<-'}</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>{assessment.title}</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '2px' }}>
            {group?.name} - {subject?.name} - {new Date(assessment.date).toLocaleDateString('es-ES')}
          </p>
          {assessment.teamArrangementId && (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
              Agrupacion activa: {arrangements?.find(arrangement => arrangement.id === assessment.teamArrangementId)?.name ?? 'Seleccionada'}
            </p>
          )}
        </div>
        <Link to={`/assessments/${assessmentId}/results`} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
          Resultados
        </Link>
      </div>

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
            width: `${students.length ? statusCounts.completed / students.length * 100 : 0}%`,
            background: 'var(--color-success)',
            borderRadius: 'var(--r-full)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--s-4)', marginTop: 'var(--s-2)' }}>
          <span className="badge badge-done">Completadas {statusCounts.completed}</span>
          <span className="badge badge-progress">En progreso {statusCounts.inProgress}</span>
          <span className="badge badge-pending">Pendientes {statusCounts.pending}</span>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
        <label className="form-label">Buscar alumno</label>
        <input
          className="form-input"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Escribe un nombre para filtrar el grupo"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
        <label className="form-label">Agrupacion del grupo</label>
        <select
          className="form-select"
          value={assessment.teamArrangementId ?? ''}
          onChange={event => {
            const next = event.target.value ? Number(event.target.value) : null
            void AssessmentsRepo.updateTeamArrangement(assessmentId, next)
            setTeamFilter('all')
          }}
        >
          <option value="">Sin agrupacion fija</option>
          {(arrangements ?? []).map(arrangement => (
            <option key={arrangement.id} value={arrangement.id}>{arrangement.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
        <label className="form-label">Filtro por mesa/equipo</label>
        <select
          className="form-select"
          value={teamFilter}
          onChange={event => setTeamFilter(event.target.value)}
          disabled={!assessment.teamArrangementId}
        >
          <option value="all">Todo el grupo</option>
          <option value="none">Sin equipo</option>
          {teamOptions.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
        {!assessment.teamArrangementId && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 'var(--s-1)' }}>
            Selecciona una agrupacion para filtrar por mesas/equipos.
          </p>
        )}
      </div>

      <div className="list">
        {students.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">ALU</div>
            <div className="empty-state-title">Sin alumnos en este grupo</div>
            <div className="empty-state-desc">Revisa el directorio de alumnado en Configuracion / Alumnos.</div>
          </div>
        )}
        {students.length > 0 && filteredStudents.length === 0 && (
          <div className="card text-sm text-muted">No hay alumnos que coincidan con la busqueda.</div>
        )}
        {filteredStudents.map(student => {
          const result = resultMap.get(student.id!)
          const status = result?.status ?? 'pending'
          const team = teamMap.get(student.id!)

          return (
            <Link
              key={student.id}
              to={`/assessments/${assessmentId}/grade/${student.id}`}
              className="list-item"
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: statusBg(status),
                  color: statusColor(status),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  flexShrink: 0,
                }}>
                  {statusIcon(status)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.displayName}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                    {statusLabel(status)}{team ? ` - ${team.name}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  style={{ minHeight: 32, padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    navigate(`/students/${student.id}`)
                  }}
                >
                  Ficha
                </button>
                {result?.finalGrade !== null && result?.finalGrade !== undefined && (
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    minWidth: 48,
                    textAlign: 'right',
                    color: gradeColor(result.finalGrade),
                  }}>
                    {formatGrade(result.finalGrade)}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function statusIcon(status: string): string {
  switch (status) {
    case 'completed': return 'OK'
    case 'in_progress': return '...'
    default: return 'o'
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
