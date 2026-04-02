import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'

export function Dashboard() {
  const [subjectFilter, setSubjectFilter] = useState('all')

  const recentAssessments = useLiveQuery(
    () => db.assessments.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const subjects = useLiveQuery(() => db.subjects.orderBy('name').toArray(), [])

  const stats = useLiveQuery(async () => {
    const [students, templates, assessments, groups, subjectsCount, results] = await Promise.all([
      db.students.count(),
      db.templates.count(),
      db.assessments.count(),
      db.classGroups.count(),
      db.subjects.count(),
      db.results.toArray(),
    ])

    return {
      students,
      templates,
      assessments,
      groups,
      subjects: subjectsCount,
      pendingResults: results.filter(result => result.status !== 'completed').length,
    }
  }, [])

  const subjectMap = new Map(subjects?.map(subject => [subject.id!, subject.name]) ?? [])
  const filteredRecentAssessments = (recentAssessments ?? [])
    .filter(assessment => subjectFilter === 'all' || String(assessment.subjectId) === subjectFilter)
    .slice(0, 5)

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <div style={{ marginBottom: 'var(--s-6)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--s-1)' }}>Cuaderno del Profe x100</h1>
        <p style={{ color: 'var(--color-text-2)' }}>
          Gestion completa: grupos, rubricas, evaluaciones, medias y sincronizacion.
        </p>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Acceso rapido</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Link to="/assessments/new" className="card" style={quickCardStyle}>
            <div style={quickIconStyle}>✅</div>
            <div style={quickLabelStyle}>Nueva evaluacion</div>
          </Link>
          <Link to="/studio" className="card" style={quickCardStyle}>
            <div style={quickIconStyle}>🧭</div>
            <div style={quickLabelStyle}>Asistente de rubricas</div>
          </Link>
          <Link to="/insights" className="card" style={quickCardStyle}>
            <div style={quickIconStyle}>📈</div>
            <div style={quickLabelStyle}>Analitica</div>
          </Link>
          <Link to="/setup" className="card" style={quickCardStyle}>
            <div style={quickIconStyle}>👥</div>
            <div style={quickLabelStyle}>Grupos y alumnado</div>
          </Link>
        </div>
      </div>

      {stats && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Resumen</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-3)' }}>
            {[
              { label: 'Alumnos', value: stats.students },
              { label: 'Rubricas', value: stats.templates },
              { label: 'Evaluaciones', value: stats.assessments },
              { label: 'Grupos', value: stats.groups },
              { label: 'Asignaturas', value: stats.subjects },
              { label: 'Pendientes', value: stats.pendingResults },
            ].map(stat => (
              <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentAssessments && recentAssessments.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Recientes</span>
            <Link to="/assessments" style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}>Ver todas</Link>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--s-3)' }}>
            <label className="form-label">Asignatura</label>
            <select className="form-select" value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)}>
              <option value="all">Todas las asignaturas</option>
              {subjects?.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          {filteredRecentAssessments.length === 0 && (
            <div className="card text-sm text-muted">No hay evaluaciones recientes para esa asignatura.</div>
          )}

          <div className="list">
            {filteredRecentAssessments.map(assessment => (
              <Link key={assessment.id} to={`/assessments/${assessment.id}`} className="list-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {assessment.title}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                    {subjectMap.get(assessment.subjectId) ?? 'Sin asignatura'} · {new Date(assessment.date).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <span className={`badge badge-${assessment.status === 'closed' ? 'done' : assessment.status === 'active' ? 'progress' : 'pending'}`}>
                  {assessment.status === 'closed' ? 'Cerrada' : assessment.status === 'active' ? 'Activa' : 'Borrador'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const quickCardStyle: React.CSSProperties = {
  textDecoration: 'none',
  textAlign: 'center',
  padding: 'var(--s-5)',
}

const quickIconStyle: React.CSSProperties = {
  fontSize: '2rem',
  marginBottom: 'var(--s-2)',
}

const quickLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.9375rem',
}
