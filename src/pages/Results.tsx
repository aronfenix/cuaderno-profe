import { useParams, useNavigate } from 'react-router-dom'
import { useAssessmentDetail } from '../hooks/useAssessment'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { formatGrade, gradeColor, calculateGrade } from '../lib/gradeCalculator'
import { generateCSV, downloadCSV } from '../lib/csvExport'
import { downloadJSON, exportFullBackup } from '../lib/jsonExport'
import type { CriterionScore } from '../types'

export function Results() {
  const { id } = useParams<{ id: string }>()
  const assessmentId = Number(id)
  const navigate = useNavigate()
  const { assessment, snapshot, students, results, subject, group } = useAssessmentDetail(assessmentId)

  const allScores = useLiveQuery(async () => {
    if (!results.length) return []
    const resultIds = results.map(r => r.id!).filter(Boolean)
    const scores: CriterionScore[] = []
    for (const rid of resultIds) {
      const s = await db.criterionScores.where('resultId').equals(rid).toArray()
      scores.push(...s)
    }
    return scores
  }, [results.map(r => r.id).join(',')])

  if (!assessment || !snapshot) return <div className="loading-page"><div className="spinner" /></div>

  const criteria = snapshot.data.criteria
  const resultMap = new Map(results.map(r => [r.studentId, r]))
  const scoresByResult = new Map<number, CriterionScore[]>()
  allScores?.forEach(s => {
    const arr = scoresByResult.get(s.resultId) ?? []
    arr.push(s)
    scoresByResult.set(s.resultId, arr)
  })

  const handleExportCSV = async () => {
    const rows = students.map(student => ({
      student,
      result: resultMap.get(student.id!) ?? {
        id: 0, assessmentId, studentId: student.id!, status: 'pending' as const,
        finalGrade: null, comment: '', completedAt: null,
        deviceId: '', syncStatus: 'pending' as const, updatedAt: 0
      },
      scores: scoresByResult.get(resultMap.get(student.id!)?.id ?? 0) ?? []
    }))
    const csv = generateCSV(rows, snapshot, assessment.title)
    downloadCSV(csv, `${assessment.title.replace(/[^a-z0-9]/gi, '_')}.csv`)
  }

  const handleExportJSON = async () => {
    const backup = await exportFullBackup()
    downloadJSON(backup, `cuaderno-backup-${new Date().toISOString().split('T')[0]}.json`)
  }

  // Per-criterion averages
  const criterionAverages = criteria.map(c => {
    const vals = (allScores ?? [])
      .filter(s => s.criterionId === c.id && s.score !== null)
      .map(s => s.score as number)
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { criterion: c, avg }
  })

  const classAvg = (() => {
    const grades = results.filter(r => r.finalGrade !== null).map(r => r.finalGrade as number)
    return grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null
  })()

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
        <button className="btn-icon" onClick={() => navigate(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.125rem' }}>{assessment.title}</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
            {group?.name} · {subject?.name}
          </p>
        </div>
      </div>

      {/* Class average */}
      {classAvg !== null && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--s-4)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 'var(--s-1)' }}>Media de clase</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: gradeColor(classAvg) }}>
            {formatGrade(classAvg)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {results.filter(r => r.status === 'completed').length}/{students.length} evaluados
          </div>
        </div>
      )}

      {/* Student grades table */}
      <div className="section">
        <div className="section-title">Notas</div>
        <div style={{ overflowX: 'auto', marginTop: 'var(--s-3)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Alumno</th>
                {criteria.map(c => (
                  <th key={c.id} style={{ ...thStyle, fontSize: '0.75rem', maxWidth: 80 }}>
                    {c.titleShort.slice(0, 12)}…
                  </th>
                ))}
                <th style={thStyle}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const result = resultMap.get(student.id!)
                const scores = scoresByResult.get(result?.id ?? 0) ?? []
                const scoreMap = new Map(scores.map(s => [s.criterionId, s.score]))
                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={tdStyle}>{student.displayName}</td>
                    {criteria.map(c => {
                      const s = scoreMap.get(c.id)
                      return (
                        <td key={c.id} style={{ ...tdStyle, textAlign: 'center' }}>
                          {s === undefined ? '—' : s === null ? 'N/A' : s}
                        </td>
                      )
                    })}
                    <td style={{ ...tdStyle, fontWeight: 800, textAlign: 'center', color: gradeColor(result?.finalGrade ?? null) }}>
                      {result?.finalGrade !== null && result?.finalGrade !== undefined
                        ? formatGrade(result.finalGrade)
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Criterion averages */}
      <div className="section">
        <div className="section-title">Media por criterio</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginTop: 'var(--s-3)' }}>
          {criterionAverages.map(({ criterion, avg }) => (
            <div key={criterion.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
              <div style={{ minWidth: 120, fontSize: '0.875rem', color: 'var(--color-text-2)' }}>
                {criterion.titleShort}
              </div>
              <div style={{ flex: 1, height: 8, background: 'var(--color-border)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                {avg !== null && (
                  <div style={{
                    height: '100%',
                    width: `${(avg / 5) * 100}%`,
                    background: 'var(--color-primary)',
                    borderRadius: 'var(--r-full)'
                  }} />
                )}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, minWidth: 32 }}>
                {avg !== null ? avg.toFixed(1) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="section">
        <div className="section-title">Exportar</div>
        <div style={{ display: 'flex', gap: 'var(--s-3)', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            📊 Exportar CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportJSON}>
            📦 Backup JSON completo
          </button>
        </div>
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
  whiteSpace: 'nowrap'
}

const tdStyle: React.CSSProperties = {
  padding: '8px 4px',
  color: 'var(--color-text)'
}
