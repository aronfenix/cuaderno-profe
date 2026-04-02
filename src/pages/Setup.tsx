import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { GroupsRepo } from '../db/repos/GroupsRepo'
import { StudentsRepo } from '../db/repos/StudentsRepo'
import { TeamsRepo } from '../db/repos/TeamsRepo'
import { parseGroupedStudents } from '../lib/studentImport'

type SetupTab = 'years' | 'groups' | 'students' | 'teams' | 'subjects' | 'import'

export function Setup() {
  const [activeTab, setActiveTab] = useState<SetupTab>('groups')

  const years = useLiveQuery(() => GroupsRepo.getAllYears(), [])
  const activeYear = useLiveQuery(() => GroupsRepo.getResolvedActiveYear(), [])
  const groups = useLiveQuery(
    () => GroupsRepo.getAllGroups(),
    []
  )
  const subjects = useLiveQuery(
    () => GroupsRepo.getAllSubjects(),
    []
  )

  return (
    <div className="page">
      <h1 className="page-title">Configuracion</h1>

      <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-4)', overflowX: 'auto' }}>
        {(['groups', 'students', 'teams', 'subjects', 'import', 'years'] as const).map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab)}
            style={{ whiteSpace: 'nowrap', padding: 'var(--s-2) var(--s-3)', minHeight: 36 }}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {activeYear && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: 'var(--s-4)' }}>
          Curso activo: <strong>{activeYear.name}</strong>
        </p>
      )}
      <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', marginBottom: 'var(--s-4)' }}>
        Mostrando todos los grupos y asignaturas del proyecto (no solo del curso activo).
      </p>

      {activeTab === 'years' && <YearsTab years={years ?? []} activeYearId={activeYear?.id} />}
      {activeTab === 'groups' && <GroupsTab groups={groups ?? []} activeYear={activeYear} />}
      {activeTab === 'students' && <StudentsTab groups={groups ?? []} activeYear={activeYear} />}
      {activeTab === 'teams' && <TeamsTab groups={groups ?? []} activeYear={activeYear} />}
      {activeTab === 'subjects' && <SubjectsTab subjects={subjects ?? []} activeYear={activeYear} />}
      {activeTab === 'import' && <ImportTab groups={groups ?? []} activeYear={activeYear} />}
    </div>
  )
}

function tabLabel(tab: SetupTab): string {
  switch (tab) {
    case 'years': return 'Cursos'
    case 'groups': return 'Grupos'
    case 'students': return 'Alumnos'
    case 'teams': return 'Equipos'
    case 'subjects': return 'Asignaturas'
    case 'import': return 'Importador'
    default: return tab
  }
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

function YearsTab({ years, activeYearId }: { years: Awaited<ReturnType<typeof GroupsRepo.getAllYears>>, activeYearId?: number }) {
  const [newName, setNewName] = useState('')

  const create = async () => {
    if (!newName.trim()) return
    await GroupsRepo.createYear(newName.trim())
    setNewName('')
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Nuevo curso</label>
        <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
          <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="2026-2027" />
          <button className="btn btn-primary" onClick={create}>Crear</button>
        </div>
      </div>
      <div className="list">
        {years.map(y => (
          <div key={y.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: y.isActive ? 700 : 400 }}>{y.name}</span>
            {y.id !== activeYearId
              ? <button className="btn btn-ghost" style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto' }} onClick={() => GroupsRepo.setActiveYear(y.id!)}>Activar</button>
              : <span className="badge badge-done">Activo</span>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

function GroupsTab({ groups, activeYear }: { groups: Awaited<ReturnType<typeof GroupsRepo.getGroupsByYear>>, activeYear: Awaited<ReturnType<typeof GroupsRepo.getActiveYear>> }) {
  const [newName, setNewName] = useState('')
  const [bulkGroups, setBulkGroups] = useState('')

  const create = async () => {
    if (!newName.trim() || !activeYear?.id) return
    await GroupsRepo.createGroup(newName.trim(), activeYear.id)
    setNewName('')
  }

  const importBulkGroups = async () => {
    if (!activeYear?.id || !bulkGroups.trim()) return
    const existingNames = new Set(groups.map(g => normalize(g.name)))
    const names = bulkGroups.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
    for (const name of names) {
      const key = normalize(name)
      if (existingNames.has(key)) continue
      await GroupsRepo.createGroup(name, activeYear.id)
      existingNames.add(key)
    }
    setBulkGroups('')
  }

  return (
    <div>
      {!activeYear && <p style={{ color: 'var(--color-muted)' }}>Crea un curso academico primero.</p>}
      {activeYear && (
        <>
          <div className="form-group">
            <label className="form-label">Nuevo grupo</label>
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="6A" />
              <button className="btn btn-primary" onClick={create}>Crear</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Importar grupos (uno por linea)</label>
            <textarea
              className="form-textarea"
              rows={5}
              value={bulkGroups}
              onChange={e => setBulkGroups(e.target.value)}
              placeholder={'6A\n6B\n1ESO-A'}
            />
            <button className="btn btn-secondary" onClick={importBulkGroups}>Importar grupos</button>
          </div>
        </>
      )}
      <div className="list">
        {groups.map(g => (
          <div key={g.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{g.name}</span>
            <button
              className="btn btn-danger"
              style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
              onClick={() => GroupsRepo.deleteGroup(g.id!)}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StudentsTab({ groups, activeYear }: { groups: Awaited<ReturnType<typeof GroupsRepo.getGroupsByYear>>, activeYear: Awaited<ReturnType<typeof GroupsRepo.getResolvedActiveYear>> }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [search, setSearch] = useState('')
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, string>>({})

  const activeGroup = groups[0]?.id ? selectedGroupId ?? groups[0].id ?? null : null

  const students = useLiveQuery(
    () => activeGroup ? StudentsRepo.getByGroup(activeGroup) : Promise.resolve([]),
    [activeGroup]
  )
  const allStudents = useLiveQuery(() => StudentsRepo.getAll(), [])
  const enrollments = useLiveQuery(() => db.enrollments.toArray(), [])

  const groupNameById = new Map(groups.map(group => [group.id!, group.name]))
  const groupYearById = new Map(groups.map(group => [group.id!, group.yearId]))
  const rosterDirectory = (allStudents ?? [])
    .map(student => {
      const matches = (enrollments ?? []).filter(enrollment => enrollment.studentId === student.id)
      return {
        student,
        groupNames: matches.map(match => groupNameById.get(match.groupId)).filter(Boolean) as string[],
      }
    })
    .filter(entry => normalize(entry.student.displayName).includes(normalize(search)))

  const addStudent = async () => {
    if (!newName.trim() || !activeGroup) return
    const yearId = activeYear?.id ?? groupYearById.get(activeGroup)
    if (!yearId) return
    const sid = await StudentsRepo.create(newName.trim())
    await StudentsRepo.enroll(sid, activeGroup, yearId)
    setNewName('')
  }

  const addBulk = async () => {
    if (!bulkText.trim() || !activeGroup) return
    const yearId = activeYear?.id ?? groupYearById.get(activeGroup)
    if (!yearId) return
    const existing = new Set((students ?? []).map(s => normalize(s.displayName)))
    const names = bulkText.split(/\r?\n/).map(n => n.trim()).filter(Boolean)

    for (const name of names) {
      const key = normalize(name)
      if (existing.has(key)) continue
      const id = await StudentsRepo.create(name)
      await StudentsRepo.enroll(id, activeGroup, yearId)
      existing.add(key)
    }

    setBulkText('')
  }

  const assignStudentToGroup = async (studentId: number) => {
    const targetGroupId = Number(assignmentDrafts[studentId] ?? '')
    if (!targetGroupId) return

    const yearId = groupYearById.get(targetGroupId)
    if (!yearId) return

    await StudentsRepo.enroll(studentId, targetGroupId, yearId)
    setAssignmentDrafts(current => ({ ...current, [studentId]: '' }))
  }

  return (
    <div>
      {groups.length === 0 && <p style={{ color: 'var(--color-muted)' }}>Crea un grupo primero.</p>}
      {groups.length > 0 && (
        <>
          <div className="form-group">
            <label className="form-label">Grupo</label>
            <select className="form-select" value={activeGroup ?? ''} onChange={e => setSelectedGroupId(Number(e.target.value))}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Alta manual</label>
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <input
                className="form-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStudent()}
                placeholder="Nombre y apellidos"
              />
              <button className="btn btn-primary" onClick={addStudent}>Agregar</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Importar alumnos (uno por linea)</label>
            <textarea
              className="form-textarea"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={8}
              placeholder={'Ana Lopez\nPablo Ruiz\n...'}
            />
            <button className="btn btn-secondary" onClick={addBulk}>Importar al grupo</button>
          </div>

          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: 'var(--s-3)' }}>
            {students?.length ?? 0} alumnos en este grupo
          </p>

          <div className="list">
            {students?.map(s => (
              <div key={s.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
                <Link
                  to={`/students/${s.id}`}
                  style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', flex: 1, minWidth: 0 }}
                >
                  {s.displayName}
                </Link>
                <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
                  <Link
                    to={`/students/${s.id}`}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem', textDecoration: 'none' }}
                  >
                    Ficha
                  </Link>
                  <button
                    className="btn btn-danger"
                    style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
                    onClick={() => StudentsRepo.delete(s.id!)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">Buscar en todo el alumnado</label>
            <input
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Busca por nombre para localizar cualquier alumno"
            />
          </div>

          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: 'var(--s-3)' }}>
            {rosterDirectory.length} coincidencias en el directorio general
          </p>

          <div className="list">
            {rosterDirectory.map(entry => (
              <div key={entry.student.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link
                    to={`/students/${entry.student.id}`}
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {entry.student.displayName}
                  </Link>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 2 }}>
                    {entry.groupNames.length ? entry.groupNames.join(' · ') : 'Sin grupo asignado'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {groups.length > 0 && (
                    <>
                      <select
                        className="form-select"
                        style={{ minWidth: 140, maxWidth: 180, minHeight: 36, padding: '0.4rem 0.75rem' }}
                        value={assignmentDrafts[entry.student.id!] ?? ''}
                        onChange={event => setAssignmentDrafts(current => ({
                          ...current,
                          [entry.student.id!]: event.target.value,
                        }))}
                      >
                        <option value="">Asignar a grupo...</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
                        onClick={() => assignStudentToGroup(entry.student.id!)}
                      >
                        Asignar
                      </button>
                    </>
                  )}
                  <Link
                    to={`/students/${entry.student.id}`}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem', textDecoration: 'none' }}
                  >
                    Ficha
                  </Link>
                  <button
                    className="btn btn-danger"
                    style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
                    onClick={() => StudentsRepo.delete(entry.student.id!)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TeamsTab({
  groups,
  activeYear,
}: {
  groups: Awaited<ReturnType<typeof GroupsRepo.getGroupsByYear>>
  activeYear: Awaited<ReturnType<typeof GroupsRepo.getResolvedActiveYear>>
}) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [newArrangementName, setNewArrangementName] = useState('Mesas normales')
  const [selectedArrangementId, setSelectedArrangementId] = useState<number | null>(null)
  const [newTeamName, setNewTeamName] = useState('Mesa')
  const [minSize, setMinSize] = useState(3)
  const [maxSize, setMaxSize] = useState(5)
  const [teamPrefix, setTeamPrefix] = useState('Mesa')

  const activeGroupId = selectedGroupId ?? groups[0]?.id ?? null
  const yearByGroup = new Map(groups.map(group => [group.id!, group.yearId]))

  const students = useLiveQuery(
    () => activeGroupId ? StudentsRepo.getByGroup(activeGroupId) : Promise.resolve([]),
    [activeGroupId]
  )
  const arrangements = useLiveQuery(
    () => activeGroupId ? TeamsRepo.getArrangementsByGroup(activeGroupId) : Promise.resolve([]),
    [activeGroupId]
  )
  const effectiveArrangementId = selectedArrangementId ?? arrangements?.[0]?.id ?? null
  const teams = useLiveQuery(
    () => effectiveArrangementId ? TeamsRepo.getByArrangement(effectiveArrangementId) : Promise.resolve([]),
    [effectiveArrangementId]
  )
  const teamByStudent = useLiveQuery(
    () => effectiveArrangementId ? TeamsRepo.getTeamMapForArrangement(effectiveArrangementId) : Promise.resolve(new Map<number, Awaited<ReturnType<typeof TeamsRepo.getByGroup>>[number]>()),
    [effectiveArrangementId, teams?.map(team => team.id).join(',')]
  )

  const createArrangement = async () => {
    if (!activeGroupId || !newArrangementName.trim()) return
    const yearId = activeYear?.id ?? yearByGroup.get(activeGroupId)
    if (!yearId) return
    const createdId = await TeamsRepo.createArrangement({
      groupId: activeGroupId,
      yearId,
      name: newArrangementName.trim(),
    })
    setSelectedArrangementId(createdId)
    setNewArrangementName('')
  }

  const createTeam = async () => {
    if (!activeGroupId || !effectiveArrangementId || !newTeamName.trim()) return
    const yearId = activeYear?.id ?? yearByGroup.get(activeGroupId)
    if (!yearId) return
    await TeamsRepo.create({
      groupId: activeGroupId,
      yearId,
      arrangementId: effectiveArrangementId,
      name: newTeamName.trim(),
    })
    setNewTeamName('')
  }

  const autoDistribute = async () => {
    if (!activeGroupId || !effectiveArrangementId || !students?.length) return
    const yearId = activeYear?.id ?? yearByGroup.get(activeGroupId)
    if (!yearId) return

    await TeamsRepo.autoDistributeStudents({
      arrangementId: effectiveArrangementId,
      groupId: activeGroupId,
      yearId,
      students,
      minSize,
      maxSize,
      teamPrefix,
    })
  }

  const memberCountByTeamId = new Map<number, number>()
  ;(teamByStudent ?? new Map()).forEach(team => {
    memberCountByTeamId.set(team.id!, (memberCountByTeamId.get(team.id!) ?? 0) + 1)
  })

  return (
    <div>
      {groups.length === 0 && (
        <p style={{ color: 'var(--color-muted)' }}>Crea un grupo primero para organizar mesas/equipos.</p>
      )}

      {groups.length > 0 && (
        <>
          <div className="form-group">
            <label className="form-label">Grupo</label>
            <select
              className="form-select"
              value={activeGroupId ?? ''}
              onChange={event => {
                setSelectedGroupId(Number(event.target.value))
                setSelectedArrangementId(null)
              }}
            >
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nueva agrupacion de clase</label>
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <input
                className="form-input"
                value={newArrangementName}
                onChange={event => setNewArrangementName(event.target.value)}
                placeholder="Mesas normales, Cooperativo, Laboratorio..."
              />
              <button className="btn btn-primary" onClick={createArrangement}>Crear</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Agrupacion activa</label>
            <select
              className="form-select"
              value={effectiveArrangementId ?? ''}
              onChange={event => setSelectedArrangementId(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Selecciona agrupacion...</option>
              {(arrangements ?? []).map(arrangement => (
                <option key={arrangement.id} value={arrangement.id}>{arrangement.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem', marginBottom: 'var(--s-3)' }}>
            <button
              className="btn btn-danger"
              style={{ minHeight: 32, padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
              disabled={!effectiveArrangementId}
              onClick={() => {
                if (!effectiveArrangementId) return
                const target = arrangements?.find(arrangement => arrangement.id === effectiveArrangementId)
                const confirmed = window.confirm(`Archivar la agrupacion "${target?.name ?? ''}"?`)
                if (!confirmed) return
                void TeamsRepo.archiveArrangement(effectiveArrangementId)
                setSelectedArrangementId(null)
              }}
            >
              Archivar agrupacion
            </button>
          </div>

          <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--s-2)' }}>Reparto automatico</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s-2)', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Min alumnos</label>
                <input type="number" className="form-input" min={1} max={40} value={minSize} onChange={event => setMinSize(Number(event.target.value))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Max alumnos</label>
                <input type="number" className="form-input" min={1} max={40} value={maxSize} onChange={event => setMaxSize(Number(event.target.value))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre base</label>
                <input className="form-input" value={teamPrefix} onChange={event => setTeamPrefix(event.target.value)} placeholder="Mesa" />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 'var(--s-3)' }} onClick={autoDistribute} disabled={!effectiveArrangementId || !(students?.length)}>
              Repartir automaticamente la clase
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Nuevo equipo manual</label>
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <input className="form-input" value={newTeamName} onChange={event => setNewTeamName(event.target.value)} placeholder="Mesa 1" />
              <button className="btn btn-secondary" onClick={createTeam} disabled={!effectiveArrangementId}>Anadir</button>
            </div>
          </div>

          <div className="list" style={{ marginBottom: 'var(--s-4)' }}>
            {(arrangements ?? []).length === 0 && (
              <div className="card text-sm text-muted">Crea primero una agrupacion para este grupo.</div>
            )}
            {(arrangements ?? []).length > 0 && (teams ?? []).length === 0 && (
              <div className="card text-sm text-muted">Sin equipos todavia en este grupo.</div>
            )}
            {(teams ?? []).map(team => (
              <div key={team.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{team.name}</div>
                  <div className="text-sm text-muted">
                    {memberCountByTeamId.get(team.id!) ?? 0} alumnos
                  </div>
                </div>
                <button
                  className="btn btn-danger"
                  style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
                  onClick={() => TeamsRepo.archive(team.id!)}
                >
                  Archivar
                </button>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ marginBottom: 'var(--s-2)' }}>Asignacion de alumnos a {arrangements?.find(arrangement => arrangement.id === effectiveArrangementId)?.name ?? 'agrupacion'}</div>
          <div className="list">
            {(students ?? []).map(student => {
              const assignedTeam = (teamByStudent ?? new Map()).get(student.id!)
              return (
                <div key={student.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between', gap: 'var(--s-2)' }}>
                  <Link
                    to={`/students/${student.id}`}
                    style={{ flex: 1, minWidth: 0, color: 'var(--color-text)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {student.displayName}
                  </Link>
                  <select
                    className="form-select"
                    style={{ minWidth: 180, maxWidth: 220, minHeight: 36, padding: '0.4rem 0.75rem' }}
                    value={assignedTeam?.id ?? ''}
                    onChange={event => {
                      const nextValue = event.target.value ? Number(event.target.value) : null
                      if (!effectiveArrangementId) return
                      void TeamsRepo.setStudentTeam(effectiveArrangementId, student.id!, nextValue)
                    }}
                  >
                    <option value="">Sin equipo</option>
                    {(teams ?? []).map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function SubjectsTab({ subjects, activeYear }: { subjects: Awaited<ReturnType<typeof GroupsRepo.getSubjectsByYear>>, activeYear: Awaited<ReturnType<typeof GroupsRepo.getActiveYear>> }) {
  const [newName, setNewName] = useState('')

  const create = async () => {
    if (!newName.trim() || !activeYear?.id) return
    await GroupsRepo.createSubject(newName.trim(), activeYear.id)
    setNewName('')
  }

  return (
    <div>
      {!activeYear && <p style={{ color: 'var(--color-muted)' }}>Crea un curso academico primero.</p>}
      {activeYear && (
        <div className="form-group">
          <label className="form-label">Nueva asignatura</label>
          <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
            <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Lengua" />
            <button className="btn btn-primary" onClick={create}>Crear</button>
          </div>
        </div>
      )}
      <div className="list">
        {subjects.map(s => (
          <div key={s.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{s.name}</span>
            <button
              className="btn btn-danger"
              style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
              onClick={() => GroupsRepo.deleteSubject(s.id!)}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ImportTab({
  groups,
  activeYear,
}: {
  groups: Awaited<ReturnType<typeof GroupsRepo.getGroupsByYear>>
  activeYear: Awaited<ReturnType<typeof GroupsRepo.getActiveYear>>
}) {
  const [rawText, setRawText] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const guide = useMemo(() => 'Formato recomendado: grupo;alumno (tambien coma o tab). Primera linea opcional de cabecera: grupo;alumno', [])

  const executeImport = async () => {
    if (!activeYear?.id) {
      setSummary('Primero crea o activa un curso academico.')
      return
    }

    const parsed = parseGroupedStudents(rawText)
    if (!parsed.rows.length && parsed.errors.length === 0) {
      setSummary('No hay filas para importar.')
      return
    }

    setRunning(true)
    try {
      const groupMap = new Map<string, number>()
      groups.forEach(group => groupMap.set(normalize(group.name), group.id!))

      const rosterMap = new Map<number, Set<string>>()
      const preload = await Promise.all(groups.map(async group => ({ groupId: group.id!, students: await StudentsRepo.getByGroup(group.id!) })))
      preload.forEach(entry => {
        rosterMap.set(entry.groupId, new Set(entry.students.map(s => normalize(s.displayName))))
      })

      let createdGroups = 0
      let createdStudents = 0
      let skippedStudents = 0

      for (const row of parsed.rows) {
        const groupName = row.groupName.trim()
        const studentName = row.studentName.trim()
        const groupKey = normalize(groupName)

        let groupId = groupMap.get(groupKey)
        if (!groupId) {
          groupId = await GroupsRepo.createGroup(groupName, activeYear.id)
          groupMap.set(groupKey, groupId)
          rosterMap.set(groupId, new Set())
          createdGroups += 1
        }

        const roster = rosterMap.get(groupId) ?? new Set<string>()
        const studentKey = normalize(studentName)
        if (roster.has(studentKey)) {
          skippedStudents += 1
          continue
        }

        const studentId = await StudentsRepo.create(studentName)
        await StudentsRepo.enroll(studentId, groupId, activeYear.id)
        roster.add(studentKey)
        rosterMap.set(groupId, roster)
        createdStudents += 1
      }

      const errorsText = parsed.errors.length ? ` Errores: ${parsed.errors.length}.` : ''
      setSummary(`Importacion completada. Grupos creados: ${createdGroups}. Alumnos creados: ${createdStudents}. Duplicados omitidos: ${skippedStudents}.${errorsText}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-2)' }}>Importador avanzado de grupos y alumnos</h2>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--s-3)' }}>{guide}</p>

        <textarea
          className="form-textarea"
          rows={10}
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={'grupo;alumno\n6A;Ana Lopez\n6A;Mario Lopez\n6B;Lucia Perez'}
        />

        <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={executeImport} disabled={running}>
            {running ? 'Importando...' : 'Ejecutar importacion'}
          </button>
          <button className="btn btn-secondary" onClick={() => setRawText('')} disabled={running}>
            Limpiar
          </button>
        </div>
      </div>

      {summary && (
        <div className="card text-sm" style={{ marginBottom: 'var(--s-3)' }}>
          {summary}
        </div>
      )}
    </div>
  )
}
