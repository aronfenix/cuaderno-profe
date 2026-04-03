import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { GroupsRepo } from '../db/repos/GroupsRepo'
import { StudentsRepo } from '../db/repos/StudentsRepo'
import { ChecklistsRepo } from '../db/repos/ChecklistsRepo'
import type { ChecklistKind, ChecklistValue } from '../types'
import {
  getPinnedFavorites,
  removePinnedFavorite,
  upsertPinnedFavorite,
} from '../lib/quickAccess'

function todayIsoDate(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function defaultTitle(kind: ChecklistKind): string {
  switch (kind) {
    case 'attendance': return 'Pase de lista'
    case 'authorization': return 'Checklist de autorizaciones'
    default: return 'Checklist de aula'
  }
}

function kindLabel(kind: ChecklistKind): string {
  switch (kind) {
    case 'attendance': return 'Asistencia'
    case 'authorization': return 'Autorizaciones'
    default: return 'Checklist'
  }
}

function valueLabel(value: ChecklistValue): string {
  switch (value) {
    case 'yes': return 'Si'
    case 'no': return 'No'
    default: return 'N.A.'
  }
}

export function Checklists() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId?: string }>()

  const groups = useLiveQuery(() => GroupsRepo.getAllGroups(), [])
  const subjects = useLiveQuery(() => GroupsRepo.getAllSubjects(), [])
  const activeYear = useLiveQuery(() => GroupsRepo.getResolvedActiveYear(), [])

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [kind, setKind] = useState<ChecklistKind>('attendance')
  const [title, setTitle] = useState(defaultTitle('attendance'))
  const [date, setDate] = useState(todayIsoDate())
  const [subjectId, setSubjectId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [pinnedPaths, setPinnedPaths] = useState<Set<string>>(
    () => new Set(getPinnedFavorites().map(item => item.path))
  )

  const routeSessionId = sessionId ? Number(sessionId) : null
  const routeSession = useLiveQuery(
    () => (routeSessionId && Number.isFinite(routeSessionId)
      ? ChecklistsRepo.getById(routeSessionId)
      : Promise.resolve(undefined)),
    [routeSessionId]
  )

  const activeGroupId = selectedGroupId ?? groups?.[0]?.id ?? null
  const groupYearById = useMemo(
    () => new Map((groups ?? []).map(group => [group.id!, group.yearId])),
    [groups]
  )
  const groupNameById = useMemo(
    () => new Map((groups ?? []).map(group => [group.id!, group.name])),
    [groups]
  )

  const sessions = useLiveQuery(
    () => activeGroupId ? ChecklistsRepo.getByGroup(activeGroupId) : Promise.resolve([]),
    [activeGroupId]
  )
  const entries = useLiveQuery(
    () => selectedSessionId ? ChecklistsRepo.getEntries(selectedSessionId) : Promise.resolve([]),
    [selectedSessionId]
  )
  const studentsInGroup = useLiveQuery(
    () => activeGroupId ? StudentsRepo.getByGroup(activeGroupId) : Promise.resolve([]),
    [activeGroupId]
  )

  useEffect(() => {
    if (!routeSessionId) return
    if (!Number.isFinite(routeSessionId)) {
      navigate('/checklists', { replace: true })
      return
    }
    if (!routeSession) return

    setSelectedGroupId(routeSession.groupId)
    setSelectedSessionId(routeSession.id ?? null)
  }, [navigate, routeSessionId, routeSession])

  useEffect(() => {
    if (!sessions?.length) {
      setSelectedSessionId(null)
      if (!routeSessionId) navigate('/checklists', { replace: true })
      return
    }

    const exists = sessions.some(session => session.id === selectedSessionId)
    if (exists) return

    const fallbackId = sessions[0].id ?? null
    setSelectedSessionId(fallbackId)
    if (fallbackId) navigate(`/checklists/${fallbackId}`, { replace: true })
  }, [navigate, routeSessionId, selectedSessionId, sessions])

  useEffect(() => {
    setTitle(defaultTitle(kind))
  }, [kind])

  useEffect(() => {
    const drafts: Record<number, string> = {}
    for (const entry of entries ?? []) {
      drafts[entry.id!] = entry.comment ?? ''
    }
    setCommentDrafts(drafts)
  }, [entries])

  const stats = useMemo(() => {
    const source = entries ?? []
    return source.reduce(
      (acc, entry) => {
        if (entry.value === 'yes') acc.yes += 1
        if (entry.value === 'no') acc.no += 1
        if (entry.value === 'na') acc.na += 1
        return acc
      },
      { yes: 0, no: 0, na: 0 }
    )
  }, [entries])

  const filteredEntries = useMemo(() => {
    const source = entries ?? []
    const query = search.trim().toLowerCase()
    if (!query) return source
    return source.filter(entry => entry.studentName.toLowerCase().includes(query))
  }, [entries, search])

  const createChecklist = async () => {
    if (!activeGroupId) return
    const yearId = activeYear?.id ?? groupYearById.get(activeGroupId)
    if (!yearId) return
    if (!title.trim()) return

    const createdId = await ChecklistsRepo.createSession({
      title: title.trim(),
      kind,
      date,
      yearId,
      groupId: activeGroupId,
      subjectId: subjectId ? Number(subjectId) : null,
    })
    setSelectedSessionId(createdId)
    setSearch('')
    navigate(`/checklists/${createdId}`)
  }

  const selectedSession = (sessions ?? []).find(session => session.id === selectedSessionId)
  const selectedSessionPath = selectedSession?.id ? `/checklists/${selectedSession.id}` : ''
  const selectedSessionPinned = selectedSessionPath ? pinnedPaths.has(selectedSessionPath) : false

  const subjectMap = new Map((subjects ?? []).map(subject => [subject.id!, subject.name]))

  return (
    <div className="page">
      <h1 className="page-title">Lista y checklist</h1>
      <p className="page-subtitle">Pasa lista y lleva checks rapidos (Si / No / N.A.) por grupo.</p>

      {!(groups?.length) && (
        <div className="card text-sm text-muted">
          Crea grupos y alumnos primero desde Configuracion para empezar a pasar lista.
        </div>
      )}

      {(groups?.length ?? 0) > 0 && (
        <>
          <div className="form-group">
            <label className="form-label">Grupo</label>
            <select
              className="form-select"
              value={activeGroupId ?? ''}
              onChange={event => {
                setSelectedGroupId(Number(event.target.value))
                setSelectedSessionId(null)
                navigate('/checklists')
              }}
            >
              {(groups ?? []).map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted">
              Alumnos en grupo: {studentsInGroup?.length ?? 0}
            </p>
          </div>

          <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-3)' }}>Nuevo registro</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo</label>
                <select className="form-select" value={kind} onChange={event => setKind(event.target.value as ChecklistKind)}>
                  <option value="attendance">Pase de lista</option>
                  <option value="authorization">Autorizaciones</option>
                  <option value="custom">Checklist personalizado</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha</label>
                <input type="date" className="form-input" value={date} onChange={event => setDate(event.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Titulo</label>
              <input
                className="form-input"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Ej: Autorizacion excursion 6A"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Asignatura (opcional)</label>
              <select className="form-select" value={subjectId} onChange={event => setSubjectId(event.target.value)}>
                <option value="">Sin asignatura</option>
                {(subjects ?? []).map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={createChecklist}>
              Crear checklist
            </button>
          </div>

          <div className="section">
            <div className="section-header">
              <span className="section-title">Registros recientes</span>
            </div>
            <div className="list">
              {(sessions ?? []).length === 0 && (
                <div className="card text-sm text-muted">Todavia no hay registros para este grupo.</div>
              )}
              {(sessions ?? []).map(session => (
                <div
                  key={session.id}
                  className="list-item"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedSessionId === session.id ? 'var(--color-primary)' : undefined,
                    boxShadow: selectedSessionId === session.id ? 'var(--shadow-sm)' : undefined,
                  }}
                  onClick={() => {
                    setSelectedSessionId(session.id ?? null)
                    if (session.id) navigate(`/checklists/${session.id}`)
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.title}
                    </div>
                    <div className="text-sm text-muted">
                      {kindLabel(session.kind)} · {new Date(session.date).toLocaleDateString('es-ES')}
                      {session.subjectId ? ` · ${subjectMap.get(session.subjectId) ?? 'Asignatura'}` : ''}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ minHeight: 32, padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={async event => {
                      event.stopPropagation()
                      const accepted = window.confirm('Eliminar este checklist y todas sus marcas?')
                      if (!accepted) return
                      const deletedPath = `/checklists/${session.id}`
                      const nextPinned = removePinnedFavorite(deletedPath)
                      setPinnedPaths(new Set(nextPinned.map(item => item.path)))
                      await ChecklistsRepo.deleteSession(session.id!)
                      if (selectedSessionId === session.id) {
                        setSelectedSessionId(null)
                        navigate('/checklists')
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selectedSession && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Edicion rapida</span>
              </div>
              <div className="card" style={{ marginBottom: 'var(--s-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s-2)' }}>
                  <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-1)' }}>{selectedSession.title}</h2>
                  <button
                    className={`btn ${selectedSessionPinned ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: 34, padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => {
                      if (!selectedSessionPath) return
                      if (selectedSessionPinned) {
                        const next = removePinnedFavorite(selectedSessionPath)
                        setPinnedPaths(new Set(next.map(item => item.path)))
                        return
                      }
                      const label = `${selectedSession.title} (${groupNameById.get(selectedSession.groupId) ?? 'Grupo'})`
                      const next = upsertPinnedFavorite({ path: selectedSessionPath, label, icon: '☑️' })
                      setPinnedPaths(new Set(next.map(item => item.path)))
                    }}
                  >
                    {selectedSessionPinned ? '★ Favorito' : '☆ Marcar favorito'}
                  </button>
                </div>

                <p className="text-sm text-muted" style={{ marginBottom: 'var(--s-3)' }}>
                  {kindLabel(selectedSession.kind)} · {new Date(selectedSession.date).toLocaleDateString('es-ES')}
                  {selectedSession.subjectId ? ` · ${subjectMap.get(selectedSession.subjectId) ?? 'Asignatura'}` : ''}
                </p>

                <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={() => void ChecklistsRepo.setAllValues(selectedSession.id!, 'yes')}>
                    Marcar todo: Si
                  </button>
                  <button className="btn btn-secondary" onClick={() => void ChecklistsRepo.setAllValues(selectedSession.id!, 'no')}>
                    Marcar todo: No
                  </button>
                  <button className="btn btn-secondary" onClick={() => void ChecklistsRepo.setAllValues(selectedSession.id!, 'na')}>
                    Marcar todo: N.A.
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}>
                  <span className="badge badge-done">Si: {stats.yes}</span>
                  <span className="badge badge-progress">No: {stats.no}</span>
                  <span className="badge badge-pending">N.A.: {stats.na}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Buscar alumno</label>
                <input
                  className="form-input"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Escribe un nombre para filtrar"
                />
              </div>

              <div className="list">
                {filteredEntries.map(entry => (
                  <div key={entry.id} className="list-item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, marginBottom: 'var(--s-2)' }}>{entry.studentName}</div>

                      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', marginBottom: 'var(--s-2)' }}>
                        {(['yes', 'no', 'na'] as ChecklistValue[]).map(value => (
                          <button
                            key={value}
                            className={`btn ${entry.value === value ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ minHeight: 34, padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
                            onClick={() => void ChecklistsRepo.setEntryValue(entry.id!, value)}
                          >
                            {valueLabel(value)}
                          </button>
                        ))}
                      </div>

                      <input
                        className="form-input"
                        style={{ minHeight: 38, padding: '0.45rem 0.7rem', fontSize: '0.85rem' }}
                        value={commentDrafts[entry.id!] ?? ''}
                        onChange={event => setCommentDrafts(prev => ({ ...prev, [entry.id!]: event.target.value }))}
                        onBlur={() => void ChecklistsRepo.setEntryComment(entry.id!, commentDrafts[entry.id!] ?? '')}
                        placeholder="Comentario rapido (opcional)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
