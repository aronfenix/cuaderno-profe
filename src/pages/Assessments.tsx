import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'

export function Assessments() {
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const assessments = useLiveQuery(() =>
    db.assessments.orderBy('date').reverse().toArray(), []
  )
  const groups = useLiveQuery(() => db.classGroups.toArray(), [])
  const subjects = useLiveQuery(() => db.subjects.orderBy('name').toArray(), [])

  const groupMap = new Map(groups?.map(group => [group.id!, group.name]) ?? [])
  const subjectMap = new Map(subjects?.map(subject => [subject.id!, subject.name]) ?? [])
  const filteredAssessments = (assessments ?? []).filter(assessment => {
    const matchesSubject = subjectFilter === 'all' || String(assessment.subjectId) === subjectFilter
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter
    return matchesSubject && matchesStatus
  })

  return (
    <div className="page">
      <div className="section-header" style={{ marginBottom: 'var(--s-4)' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Evaluaciones</h1>
        <Link to="/assessments/new" className="btn btn-primary">+ Nueva</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Asignatura</label>
          <select className="form-select" value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)}>
            <option value="all">Todas</option>
            {subjects?.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Estado</label>
          <select className="form-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="active">Activas</option>
            <option value="closed">Cerradas</option>
            <option value="draft">Borrador</option>
          </select>
        </div>
      </div>

      {assessments === undefined && <div className="loading-page"><div className="spinner" /></div>}

      {assessments?.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">Sin evaluaciones</div>
          <div className="empty-state-desc">Crea una rubrica y empieza a evaluar.</div>
          <Link to="/assessments/new" className="btn btn-primary" style={{ marginTop: 'var(--s-4)' }}>
            Crear evaluacion
          </Link>
        </div>
      )}

      {assessments && assessments.length > 0 && filteredAssessments.length === 0 && (
        <div className="card text-sm text-muted" style={{ marginBottom: 'var(--s-4)' }}>
          No hay evaluaciones con ese filtro.
        </div>
      )}

      <div className="list">
        {filteredAssessments.map(assessment => (
          <Link key={assessment.id} to={`/assessments/${assessment.id}`} className="list-item">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {assessment.title}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 2 }}>
                {groupMap.get(assessment.groupId) ?? '?'} · {subjectMap.get(assessment.subjectId) ?? '?'} · {new Date(assessment.date).toLocaleDateString('es-ES')}
              </div>
            </div>
            <span className={`badge badge-${assessment.status === 'closed' ? 'done' : assessment.status === 'active' ? 'progress' : 'pending'}`}>
              {assessment.status === 'closed' ? 'Cerrada' : assessment.status === 'active' ? 'Activa' : 'Borrador'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
