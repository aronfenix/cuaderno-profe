import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { StudentNotesRepo } from '../db/repos/StudentNotesRepo'
import type { StudentNoteType } from '../types'
import { formatGrade, gradeColor } from '../lib/gradeCalculator'

const NOTE_TYPES: Array<{ value: StudentNoteType; label: string }> = [
  { value: 'academica', label: 'Academica' },
  { value: 'conducta', label: 'Conducta' },
  { value: 'familia', label: 'Familia' },
  { value: 'tutoria', label: 'Tutoria' },
  { value: 'adaptacion', label: 'Adaptacion' },
  { value: 'incidencia', label: 'Incidencia' },
  { value: 'fortaleza', label: 'Fortaleza' },
  { value: 'seguimiento', label: 'Seguimiento' },
]

export function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const navigate = useNavigate()

  const [noteType, setNoteType] = useState<StudentNoteType>('seguimiento')
  const [text, setText] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [saving, setSaving] = useState(false)

  const student = useLiveQuery(() => db.students.get(studentId), [studentId])
  const enrollments = useLiveQuery(() => db.enrollments.where('studentId').equals(studentId).toArray(), [studentId])
  const groups = useLiveQuery(() => db.classGroups.toArray(), [])
  const subjects = useLiveQuery(() => db.subjects.orderBy('name').toArray(), [])
  const notes = useLiveQuery(async () => {
    const rows = await StudentNotesRepo.getByStudent(studentId)
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  }, [studentId])
  const averages = useLiveQuery(async () => {
    const results = await db.results.where('studentId').equals(studentId).toArray()
    const completed = results.filter(result => result.finalGrade !== null)
    if (!completed.length) return []

    const assessments = await db.assessments.toArray()
    const subjectsMap = new Map((await db.subjects.toArray()).map(subject => [subject.id!, subject.name]))
    const bySubject = new Map<number, { sum: number; count: number }>()
    const assessmentMap = new Map(assessments.map(assessment => [assessment.id!, assessment]))

    for (const result of completed) {
      const assessment = assessmentMap.get(result.assessmentId)
      if (!assessment) continue
      const bucket = bySubject.get(assessment.subjectId) ?? { sum: 0, count: 0 }
      bucket.sum += result.finalGrade!
      bucket.count += 1
      bySubject.set(assessment.subjectId, bucket)
    }

    return Array.from(bySubject.entries())
      .map(([subjectKey, stat]) => ({
        subjectId: subjectKey,
        subjectName: subjectsMap.get(subjectKey) ?? 'Asignatura',
        average: stat.sum / stat.count,
        count: stat.count,
      }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
  }, [studentId])

  if (student === undefined) return <div className="loading-page"><div className="spinner" /></div>
  if (!student) return <div className="page"><p>Alumno no encontrado.</p></div>

  const groupMap = new Map(groups?.map(group => [group.id!, group.name]) ?? [])
  const groupChips = (enrollments ?? []).map(enrollment => groupMap.get(enrollment.groupId) ?? `Grupo ${enrollment.groupId}`)

  const createNote = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      await StudentNotesRepo.create({
        studentId,
        noteType,
        text,
        subjectId: subjectId ? Number(subjectId) : null,
        groupId: groupId ? Number(groupId) : null,
      })
      setText('')
      setSubjectId('')
      setGroupId('')
      setNoteType('seguimiento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
        <button className="btn-icon" onClick={() => navigate(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: 'var(--s-1)' }}>{student.displayName}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
            {groupChips.length ? groupChips.map(chip => (
              <span key={chip} className="chip" style={{ cursor: 'default' }}>{chip}</span>
            )) : <span className="text-sm text-muted">Sin grupo asignado</span>}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Medias por asignatura</span>
        </div>
        {(averages ?? []).length === 0 && (
          <div className="card text-sm text-muted">Sin calificaciones cerradas aun.</div>
        )}
        <div className="list">
          {(averages ?? []).map(avg => (
            <div key={avg.subjectId} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{avg.subjectName}</div>
                <div className="text-sm text-muted">{avg.count} evaluaciones</div>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: gradeColor(avg.average) }}>
                {formatGrade(avg.average)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Nueva nota de seguimiento</span>
        </div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo</label>
              <select className="form-select" value={noteType} onChange={event => setNoteType(event.target.value as StudentNoteType)}>
                {NOTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Asignatura (opcional)</label>
              <select className="form-select" value={subjectId} onChange={event => setSubjectId(event.target.value)}>
                <option value="">General</option>
                {subjects?.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Grupo (opcional)</label>
              <select className="form-select" value={groupId} onChange={event => setGroupId(event.target.value)}>
                <option value="">General</option>
                {(enrollments ?? []).map(enrollment => (
                  <option key={enrollment.id} value={enrollment.groupId}>{groupMap.get(enrollment.groupId) ?? enrollment.groupId}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 'var(--s-3)' }}>
            <label className="form-label">Comentario</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="Escribe observaciones, acuerdos con familia, incidencias o mejoras."
            />
          </div>
          <button className="btn btn-primary" disabled={saving || !text.trim()} onClick={createNote}>
            {saving ? 'Guardando...' : 'Guardar nota'}
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Historial de notas</span>
        </div>
        {(notes ?? []).length === 0 && (
          <div className="card text-sm text-muted">Sin notas de seguimiento todavia.</div>
        )}
        <div className="list">
          {(notes ?? []).map(note => (
            <div key={note.id} className="list-item" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-2)' }}>
                <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="chip" style={{ cursor: 'default' }}>{labelByType(note.noteType)}</span>
                  {note.subjectId !== null && <span className="text-sm text-muted">{subjects?.find(subject => subject.id === note.subjectId)?.name ?? 'Asignatura'}</span>}
                  {note.groupId !== null && <span className="text-sm text-muted">{groupMap.get(note.groupId) ?? 'Grupo'}</span>}
                </div>
                <span className="text-xs text-muted">{new Date(note.createdAt).toLocaleString('es-ES')}</span>
              </div>
              <div style={{ marginTop: 'var(--s-2)', lineHeight: 1.5 }}>{note.text}</div>
              <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-3)' }}>
                <button
                  className={`btn ${note.isResolved ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ minHeight: 34, padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
                  onClick={() => StudentNotesRepo.toggleResolved(note.id!, !note.isResolved)}
                >
                  {note.isResolved ? 'Reabrir' : 'Marcar resuelta'}
                </button>
                <button
                  className="btn btn-danger"
                  style={{ minHeight: 34, padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
                  onClick={() => StudentNotesRepo.delete(note.id!)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function labelByType(type: StudentNoteType): string {
  return NOTE_TYPES.find(item => item.value === type)?.label ?? type
}
