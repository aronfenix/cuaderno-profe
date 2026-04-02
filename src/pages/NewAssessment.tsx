import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { AssessmentsRepo } from '../db/repos/AssessmentsRepo'
import type { TeamArrangement } from '../types'

export function NewAssessment() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [groupId, setGroupId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [teamArrangementId, setTeamArrangementId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groups = useLiveQuery(() => db.classGroups.orderBy('name').toArray(), [])
  const subjects = useLiveQuery(() => db.subjects.orderBy('name').toArray(), [])
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), [])
  const arrangements = useLiveQuery(
    () => groupId
      ? db.teamArrangements
        .where('groupId')
        .equals(Number(groupId))
        .and(arrangement => !arrangement.isArchived)
        .sortBy('name')
      : Promise.resolve([] as TeamArrangement[]),
    [groupId]
  )

  const canSubmit = title && groupId && subjectId && templateId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    setError('')
    try {
      const { assessmentId } = await AssessmentsRepo.create({
        title,
        date,
        groupId: Number(groupId),
        subjectId: Number(subjectId),
        teamArrangementId: teamArrangementId ? Number(teamArrangementId) : null,
        templateId: Number(templateId),
      })
      navigate(`/assessments/${assessmentId}`)
    } catch (err) {
      setError('Error al crear la evaluación: ' + (err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-5)' }}>
        <button className="btn-icon" onClick={() => navigate(-1)}>←</button>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Nueva evaluación</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Título *</label>
          <input
            className="form-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Exposición oral T3"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Fecha *</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Grupo *</label>
          {groups?.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              No hay grupos. <Link to="/setup">Crea uno primero.</Link>
            </p>
          ) : (
            <select
              className="form-select"
              value={groupId}
              onChange={e => {
                setGroupId(e.target.value)
                setTeamArrangementId('')
              }}
              required
            >
              <option value="">Seleccionar grupo...</option>
              {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Agrupacion de clase (opcional)</label>
          {!groupId ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              Primero selecciona grupo para elegir una agrupacion.
            </p>
          ) : (
            <select className="form-select" value={teamArrangementId} onChange={e => setTeamArrangementId(e.target.value)}>
              <option value="">Sin agrupacion fija</option>
              {arrangements?.map(arrangement => (
                <option key={arrangement.id} value={arrangement.id}>{arrangement.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Asignatura *</label>
          {subjects?.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              No hay asignaturas. <Link to="/setup">Crea una primero.</Link>
            </p>
          ) : (
            <select className="form-select" value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
              <option value="">Seleccionar asignatura...</option>
              {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Rúbrica *</label>
          {templates?.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              No hay rúbricas. <Link to="/library">Crea una en la biblioteca.</Link>
            </p>
          ) : (
            <select className="form-select" value={templateId} onChange={e => setTemplateId(e.target.value)} required>
              <option value="">Seleccionar rúbrica...</option>
              {templates?.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.criteria.length} criterios)
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', padding: 'var(--s-3)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s-4)' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-large"
          disabled={!canSubmit || saving}
        >
          {saving ? 'Creando...' : 'Crear evaluación'}
        </button>
      </form>
    </div>
  )
}
