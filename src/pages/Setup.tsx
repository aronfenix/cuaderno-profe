import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { GroupsRepo } from '../db/repos/GroupsRepo'
import { StudentsRepo } from '../db/repos/StudentsRepo'
import { Modal } from '../components/ui/Modal'

export function Setup() {
  const [activeTab, setActiveTab] = useState<'years' | 'groups' | 'students' | 'subjects'>('groups')

  const years = useLiveQuery(() => GroupsRepo.getAllYears(), [])
  const activeYear = useLiveQuery(() => GroupsRepo.getActiveYear(), [])
  const groups = useLiveQuery(
    () => activeYear?.id ? GroupsRepo.getGroupsByYear(activeYear.id) : Promise.resolve([]),
    [activeYear?.id]
  )
  const subjects = useLiveQuery(
    () => activeYear?.id ? GroupsRepo.getSubjectsByYear(activeYear.id) : Promise.resolve([]),
    [activeYear?.id]
  )

  return (
    <div className="page">
      <h1 className="page-title">Configuración</h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-4)', overflowX: 'auto' }}>
        {(['groups', 'students', 'subjects', 'years'] as const).map(tab => (
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
          Año activo: <strong>{activeYear.name}</strong>
        </p>
      )}

      {activeTab === 'years' && <YearsTab years={years ?? []} activeYearId={activeYear?.id} />}
      {activeTab === 'groups' && <GroupsTab groups={groups ?? []} activeYear={activeYear} />}
      {activeTab === 'students' && <StudentsTab groups={groups ?? []} activeYear={activeYear} />}
      {activeTab === 'subjects' && <SubjectsTab subjects={subjects ?? []} activeYear={activeYear} />}
    </div>
  )
}

function tabLabel(tab: string): string {
  switch (tab) {
    case 'years': return '📅 Cursos'
    case 'groups': return '👥 Grupos'
    case 'students': return '🎒 Alumnos'
    case 'subjects': return '📚 Asignaturas'
    default: return tab
  }
}

// ── Years Tab ──────────────────────────────────────────────────────────────────
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
          <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="2024-2025" />
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

// ── Groups Tab ─────────────────────────────────────────────────────────────────
function GroupsTab({ groups, activeYear }: { groups: any[], activeYear: any }) {
  const [newName, setNewName] = useState('')
  const create = async () => {
    if (!newName.trim() || !activeYear?.id) return
    await GroupsRepo.createGroup(newName.trim(), activeYear.id)
    setNewName('')
  }
  return (
    <div>
      {!activeYear && <p style={{ color: 'var(--color-muted)' }}>Crea un año académico primero.</p>}
      {activeYear && (
        <div className="form-group">
          <label className="form-label">Nuevo grupo</label>
          <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
            <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="6ºA" />
            <button className="btn btn-primary" onClick={create}>Crear</button>
          </div>
        </div>
      )}
      <div className="list">
        {groups.map(g => (
          <div key={g.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{g.name}</span>
            <button className="btn btn-danger" style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
              onClick={() => GroupsRepo.deleteGroup(g.id!)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Students Tab ───────────────────────────────────────────────────────────────
function StudentsTab({ groups, activeYear }: { groups: any[], activeYear: any }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)

  const activeGroup = groups[0]?.id ? selectedGroupId ?? groups[0]?.id : null
  const students = useLiveQuery(
    () => activeGroup ? StudentsRepo.getByGroup(activeGroup) : Promise.resolve([]),
    [activeGroup]
  )

  const addStudent = async () => {
    if (!newName.trim() || !activeGroup || !activeYear?.id) return
    const sid = await StudentsRepo.create(newName.trim())
    await StudentsRepo.enroll(sid, activeGroup, activeYear.id)
    setNewName('')
  }

  const addBulk = async () => {
    if (!bulkText.trim() || !activeGroup || !activeYear?.id) return
    const names = bulkText.split('\n').map(n => n.trim()).filter(Boolean)
    await StudentsRepo.bulkCreate(names, activeGroup, activeYear.id)
    setBulkText('')
    setShowBulk(false)
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
            <label className="form-label">Añadir alumno</label>
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStudent()}
                placeholder="Nombre y apellidos" />
              <button className="btn btn-primary" onClick={addStudent}>+</button>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ marginBottom: 'var(--s-3)' }} onClick={() => setShowBulk(!showBulk)}>
            Importar lista (uno por línea)
          </button>
          {showBulk && (
            <div className="form-group">
              <textarea className="form-textarea" value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8} placeholder="Alumno 1&#10;Alumno 2&#10;..." />
              <button className="btn btn-primary" onClick={addBulk}>Importar</button>
            </div>
          )}
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: 'var(--s-3)' }}>
            {students?.length ?? 0} alumnos
          </p>
          <div className="list">
            {students?.map(s => (
              <div key={s.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
                <span>{s.displayName}</span>
                <button className="btn btn-danger" style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
                  onClick={() => StudentsRepo.delete(s.id!)}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Subjects Tab ───────────────────────────────────────────────────────────────
function SubjectsTab({ subjects, activeYear }: { subjects: any[], activeYear: any }) {
  const [newName, setNewName] = useState('')
  const create = async () => {
    if (!newName.trim() || !activeYear?.id) return
    await GroupsRepo.createSubject(newName.trim(), activeYear.id)
    setNewName('')
  }
  return (
    <div>
      {!activeYear && <p style={{ color: 'var(--color-muted)' }}>Crea un año académico primero.</p>}
      {activeYear && (
        <div className="form-group">
          <label className="form-label">Nueva asignatura</label>
          <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
            <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Lengua Castellana" />
            <button className="btn btn-primary" onClick={create}>Crear</button>
          </div>
        </div>
      )}
      <div className="list">
        {subjects.map(s => (
          <div key={s.id} className="list-item" style={{ cursor: 'default', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{s.name}</span>
            <button className="btn btn-danger" style={{ padding: 'var(--s-1) var(--s-2)', minHeight: 'auto', fontSize: '0.8125rem' }}
              onClick={() => GroupsRepo.deleteSubject(s.id!)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
