import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'

export function Assessments() {
  const assessments = useLiveQuery(() =>
    db.assessments.orderBy('date').reverse().toArray(), []
  )
  const groups = useLiveQuery(() => db.classGroups.toArray(), [])
  const subjects = useLiveQuery(() => db.subjects.toArray(), [])

  const groupMap = new Map(groups?.map(g => [g.id!, g.name]) ?? [])
  const subjectMap = new Map(subjects?.map(s => [s.id!, s.name]) ?? [])

  return (
    <div className="page">
      <div className="section-header" style={{ marginBottom: 'var(--s-4)' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Evaluaciones</h1>
        <Link to="/assessments/new" className="btn btn-primary">+ Nueva</Link>
      </div>

      {assessments === undefined && <div className="loading-page"><div className="spinner" /></div>}

      {assessments?.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">Sin evaluaciones</div>
          <div className="empty-state-desc">Crea una rúbrica y empieza a evaluar.</div>
          <Link to="/assessments/new" className="btn btn-primary" style={{ marginTop: 'var(--s-4)' }}>
            Crear evaluación
          </Link>
        </div>
      )}

      <div className="list">
        {assessments?.map(a => (
          <Link key={a.id} to={`/assessments/${a.id}`} className="list-item">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.title}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 2 }}>
                {groupMap.get(a.groupId) ?? '?'} · {subjectMap.get(a.subjectId) ?? '?'} · {new Date(a.date).toLocaleDateString('es-ES')}
              </div>
            </div>
            <span className={`badge badge-${a.status === 'closed' ? 'done' : a.status === 'active' ? 'progress' : 'pending'}`}>
              {a.status === 'closed' ? 'Cerrada' : a.status === 'active' ? 'Activa' : 'Borrador'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
