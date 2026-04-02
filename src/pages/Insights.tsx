import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { buildAnalyticsSnapshot } from '../lib/analytics'
import { formatGrade, gradeColor } from '../lib/gradeCalculator'

export function Insights() {
  const [subjectFilter, setSubjectFilter] = useState<'all' | number>('all')

  const snapshotData = useLiveQuery(async () => {
    const [assessments, results, students, subjects, groups] = await Promise.all([
      db.assessments.toArray(),
      db.results.toArray(),
      db.students.toArray(),
      db.subjects.toArray(),
      db.classGroups.toArray(),
    ])

    return buildAnalyticsSnapshot({
      assessments,
      results,
      students,
      subjects,
      groups,
    })
  }, [])

  const filteredStudentRows = useMemo(() => {
    if (!snapshotData) return []
    if (subjectFilter === 'all') return snapshotData.studentSubjectAverages
    return snapshotData.studentSubjectAverages.filter(row => row.subjectId === subjectFilter)
  }, [snapshotData, subjectFilter])

  const subjectOptions = useMemo(() => {
    if (!snapshotData) return []
    const map = new Map<number, string>()
    for (const row of snapshotData.subjectAverages) {
      map.set(row.subjectId, row.subjectName)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [snapshotData])

  if (!snapshotData) {
    return <div className="loading-page"><div className="spinner" /></div>
  }

  return (
    <div className="page">
      <h1 className="page-title">Analitica docente</h1>
      <p className="page-subtitle">
        Medias por asignatura, rendimiento por alumno e indicadores de seguimiento.
      </p>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Medias por asignatura y grupo</span>
        </div>
        {snapshotData.subjectAverages.length === 0 ? (
          <div className="card text-sm text-muted">Aun no hay evaluaciones cerradas con nota final.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Asignatura</th>
                  <th style={thStyle}>Grupo</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Media</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Muestras</th>
                </tr>
              </thead>
              <tbody>
                {snapshotData.subjectAverages.map(row => (
                  <tr key={`${row.subjectId}-${row.groupId}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={tdStyle}>{row.subjectName}</td>
                    <td style={tdStyle}>{row.groupName}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: gradeColor(row.average) }}>
                      {formatGrade(row.average)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{row.sampleSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Media por alumno y asignatura</span>
          <select
            className="form-select"
            style={{ maxWidth: 260 }}
            value={subjectFilter}
            onChange={(event) => {
              const value = event.target.value
              setSubjectFilter(value === 'all' ? 'all' : Number(value))
            }}
          >
            <option value="all">Todas las asignaturas</option>
            {subjectOptions.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>

        {filteredStudentRows.length === 0 ? (
          <div className="card text-sm text-muted">No hay datos para el filtro seleccionado.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Alumno</th>
                  <th style={thStyle}>Asignatura</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Media</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Evals.</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentRows.map(row => (
                  <tr key={`${row.studentId}-${row.subjectId}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={tdStyle}>{row.studentName}</td>
                    <td style={tdStyle}>{row.subjectName}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: gradeColor(row.average) }}>
                      {formatGrade(row.average)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{row.sampleSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Alumnado en riesgo academico</span>
        </div>
        {snapshotData.riskStudents.length === 0 ? (
          <div className="card text-sm text-muted">
            No se detectan alumnos en riesgo (media &lt; 5 con al menos 2 evaluaciones).
          </div>
        ) : (
          <div className="list">
            {snapshotData.riskStudents.map(student => (
              <div key={student.studentId} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{student.studentName}</div>
                  <div className="text-sm text-muted">{student.completedAssessments} evaluaciones cerradas</div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: gradeColor(student.overallAverage) }}>
                  {formatGrade(student.overallAverage)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 4px',
  textAlign: 'left',
  fontWeight: 700,
  color: 'var(--color-muted)',
  borderBottom: '2px solid var(--color-border)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 4px',
  color: 'var(--color-text)',
}
