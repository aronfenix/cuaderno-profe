import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import {
  QUICK_ACCESS_ITEMS,
  getFavoritePaths,
  toggleFavoritePath,
  getRecentVisits,
  type RecentVisit,
} from '../lib/quickAccess'

export function Dashboard() {
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [favoritePaths, setFavoritePaths] = useState<string[]>(() => getFavoritePaths())
  const [recentVisits] = useState<RecentVisit[]>(() => getRecentVisits())

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

  const favoriteItems = useMemo(
    () => QUICK_ACCESS_ITEMS.filter(item => favoritePaths.includes(item.path)),
    [favoritePaths]
  )

  const toggleFavorite = (path: string) => {
    setFavoritePaths(toggleFavoritePath(path))
  }

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <div style={{ marginBottom: 'var(--s-6)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--s-1)' }}>Cuaderno del Profe x100</h1>
        <p style={{ color: 'var(--color-text-2)' }}>
          Gestion completa: grupos, rubricas, evaluaciones, medias, checklists y sincronizacion.
        </p>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Favoritos</span>
        </div>

        {favoriteItems.length === 0 && (
          <div className="card text-sm text-muted" style={{ marginBottom: 'var(--s-3)' }}>
            Marca accesos con estrella en la seccion de abajo para fijarlos aqui.
          </div>
        )}

        {favoriteItems.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
            {favoriteItems.map(item => (
              <Link key={item.path} to={item.path} className="card" style={quickCardStyle}>
                <div style={quickIconStyle}>{item.icon}</div>
                <div style={quickLabelStyle}>{item.label}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Acceso rapido</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          {QUICK_ACCESS_ITEMS.map(item => {
            const isFavorite = favoritePaths.includes(item.path)
            return (
              <Link key={item.path} to={item.path} className="card" style={quickCardStyle}>
                <button
                  className="btn btn-ghost"
                  style={favoriteButtonStyle}
                  onClick={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    toggleFavorite(item.path)
                  }}
                  title={isFavorite ? 'Quitar de favoritos' : 'Anadir a favoritos'}
                >
                  {isFavorite ? '★' : '☆'}
                </button>
                <div style={quickIconStyle}>{item.icon}</div>
                <div style={quickLabelStyle}>{item.label}</div>
              </Link>
            )
          })}
        </div>
      </div>

      {recentVisits.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Recientes</span>
          </div>
          <div className="list">
            {recentVisits.map(item => (
              <Link key={item.path} to={item.path} className="list-item">
                <div style={{ width: 26, textAlign: 'center', fontSize: '1.2rem' }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  <div className="text-xs text-muted">
                    {new Date(item.visitedAt).toLocaleString('es-ES')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
            <span className="section-title">Evaluaciones recientes</span>
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

const quickCardStyle: CSSProperties = {
  textDecoration: 'none',
  textAlign: 'center',
  padding: 'var(--s-5)',
  position: 'relative',
}

const quickIconStyle: CSSProperties = {
  fontSize: '2rem',
  marginBottom: 'var(--s-2)',
}

const quickLabelStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: '0.9375rem',
}

const favoriteButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '0.4rem',
  right: '0.4rem',
  minHeight: 28,
  minWidth: 28,
  padding: 0,
  fontSize: '1rem',
}
