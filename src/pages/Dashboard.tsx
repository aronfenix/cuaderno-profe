import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'

export function Dashboard() {
  const recentAssessments = useLiveQuery(() =>
    db.assessments.orderBy('updatedAt').reverse().limit(5).toArray(), []
  )

  const stats = useLiveQuery(async () => {
    const [students, templates, assessments] = await Promise.all([
      db.students.count(),
      db.templates.count(),
      db.assessments.count(),
    ])
    return { students, templates, assessments }
  }, [])

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      {/* Hero */}
      <div style={{ marginBottom: 'var(--s-6)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--s-1)' }}>📒 Cuaderno del Profe</h1>
        <p style={{ color: 'var(--color-text-2)' }}>Evaluación con rúbricas rápida y offline</p>
      </div>

      {/* Quick actions */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Acceso rápido</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <Link to="/assessments/new" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: 'var(--s-5)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--s-2)' }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Nueva evaluación</div>
          </Link>
          <Link to="/studio" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: 'var(--s-5)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--s-2)' }}>🤖</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Rubric Studio</div>
          </Link>
          <Link to="/library" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: 'var(--s-5)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--s-2)' }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Biblioteca</div>
          </Link>
          <Link to="/setup" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: 'var(--s-5)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--s-2)' }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Mis grupos</div>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Resumen</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-3)' }}>
            {[
              { label: 'Alumnos', value: stats.students },
              { label: 'Rúbricas', value: stats.templates },
              { label: 'Evaluaciones', value: stats.assessments },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent assessments */}
      {recentAssessments && recentAssessments.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Recientes</span>
            <Link to="/assessments" style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}>Ver todas</Link>
          </div>
          <div className="list">
            {recentAssessments.map(a => (
              <Link key={a.id} to={`/assessments/${a.id}`} className="list-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                    {new Date(a.date).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <span className={`badge badge-${a.status === 'closed' ? 'done' : a.status === 'active' ? 'progress' : 'pending'}`}>
                  {a.status === 'closed' ? 'Cerrada' : a.status === 'active' ? 'Activa' : 'Borrador'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
