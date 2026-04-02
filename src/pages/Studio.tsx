import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { RubricPreview } from '../components/rubric/RubricPreview'
import { TemplatesRepo } from '../db/repos/TemplatesRepo'
import { getDeviceId } from '../db/repos/deviceId'
import { db } from '../db/schema'
import { buildAssistedTemplate } from '../lib/rubricAssistant'
import type { InstrumentTemplate, RoundingMode } from '../types'
import './Studio.css'

interface AssistantForm {
  title: string
  subject: string
  stage: string
  activityType: string
  evidence: string
  objective: string
  criteriaCount: number
  rounding: RoundingMode
}

const DEFAULT_FORM: AssistantForm = {
  title: '',
  subject: '',
  stage: '',
  activityType: 'Exposicion oral',
  evidence: 'Claridad, contenido, comunicacion, actitud',
  objective: '',
  criteriaCount: 5,
  rounding: '0.5',
}

const OTHER_OPTION = '__other__'
const DEFAULT_STAGE_OPTIONS = ['5 Primaria', '6 Primaria', '1 ESO', '2 ESO', '3 ESO', '4 ESO', 'Bachillerato']
const DEFAULT_ACTIVITY_OPTIONS = ['Exposicion oral', 'Trabajo escrito', 'Proyecto', 'Debate', 'Prueba escrita', 'Practica de laboratorio']

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'))
}

export function Studio() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null

  const [form, setForm] = useState<AssistantForm>(DEFAULT_FORM)
  const [currentTemplate, setCurrentTemplate] = useState<InstrumentTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjectIsOther, setSubjectIsOther] = useState(false)
  const [stageIsOther, setStageIsOther] = useState(false)
  const [activityIsOther, setActivityIsOther] = useState(false)

  const subjectRows = useLiveQuery(() => db.subjects.orderBy('name').toArray(), [])
  const yearRows = useLiveQuery(() => db.academicYears.orderBy('name').toArray(), [])
  const groupRows = useLiveQuery(() => db.classGroups.orderBy('name').toArray(), [])

  const subjectOptions = useMemo(
    () => uniqueSorted((subjectRows ?? []).map(subject => subject.name)),
    [subjectRows]
  )
  const stageOptions = useMemo(
    () => uniqueSorted([
      ...DEFAULT_STAGE_OPTIONS,
      ...(yearRows ?? []).map(year => year.name),
      ...(groupRows ?? []).map(group => group.name),
    ]),
    [yearRows, groupRows]
  )
  const activityOptions = useMemo(
    () => uniqueSorted(DEFAULT_ACTIVITY_OPTIONS),
    []
  )

  useEffect(() => {
    if (!editId) return
    TemplatesRepo.getById(editId).then(template => {
      if (!template) return
      setCurrentTemplate(template)
      setForm(prev => ({
        ...prev,
        title: template.title,
        subject: template.tags?.[0] ?? '',
        stage: template.tags?.[1] ?? '',
        activityType: template.tags?.[2] ?? '',
        evidence: template.criteria.map(c => c.titleShort).join(', '),
        criteriaCount: template.criteria.length,
        rounding: template.finalGrade?.rounding ?? '0.5',
      }))
    })
  }, [editId])

  useEffect(() => {
    if (form.subject && !subjectOptions.includes(form.subject)) {
      setSubjectIsOther(true)
    }
    if (form.stage && !stageOptions.includes(form.stage)) {
      setStageIsOther(true)
    }
    if (form.activityType && !activityOptions.includes(form.activityType)) {
      setActivityIsOther(true)
    }
  }, [form.subject, form.stage, form.activityType, subjectOptions, stageOptions, activityOptions])

  const applyPreset = (preset: Partial<AssistantForm>) => {
    setForm(prev => ({ ...prev, ...preset }))
  }

  const generateTemplate = useCallback(() => {
    setError(null)
    const generated = buildAssistedTemplate({
      title: form.title,
      subject: form.subject,
      stage: form.stage,
      activityType: form.activityType,
      evidence: form.evidence,
      objective: form.objective,
      criteriaCount: form.criteriaCount,
      rounding: form.rounding,
    })

    const now = Date.now()
    const template: InstrumentTemplate = {
      ...generated,
      id: editId ?? currentTemplate?.id,
      version: (currentTemplate?.version ?? 0) + 1,
      createdAt: currentTemplate?.createdAt ?? now,
      updatedAt: now,
      source: 'manual',
      conversationSummary: `Asistente guiado (${new Date(now).toLocaleString('es-ES')})`,
      syncStatus: 'pending',
      deviceId: getDeviceId(),
    }

    setCurrentTemplate(template)
  }, [form, editId, currentTemplate])

  const handleSave = useCallback(async () => {
    if (!currentTemplate || saving) return
    setSaving(true)
    setError(null)

    try {
      const payload = {
        ...currentTemplate,
        updatedAt: Date.now(),
        syncStatus: 'pending' as const,
      }

      if (editId && currentTemplate.id) {
        await TemplatesRepo.update(editId, payload)
      } else {
        const { id: _dropId, ...createData } = payload
        await TemplatesRepo.create(createData)
      }

      navigate('/library')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }, [currentTemplate, saving, editId, navigate])

  return (
    <div className="studio-layout">
      <aside className="studio-chat">
        <div className="studio-chat-header">
          <button className="btn-icon" onClick={() => navigate('/library')}>←</button>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Asistente de Rubricas</h2>
        </div>

        <div className="form-group">
          <label className="form-label">Titulo de la rubrica</label>
          <input
            className="form-input"
            value={form.title}
            onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
            placeholder="Ej: Exposicion oral T3"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Asignatura</label>
          <select
            className="form-select"
            value={subjectIsOther ? OTHER_OPTION : form.subject}
            onChange={event => {
              const value = event.target.value
              if (value === OTHER_OPTION) {
                setSubjectIsOther(true)
                if (!form.subject) setForm(prev => ({ ...prev, subject: '' }))
                return
              }
              setSubjectIsOther(false)
              setForm(prev => ({ ...prev, subject: value }))
            }}
          >
            <option value="">Selecciona asignatura...</option>
            {subjectOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value={OTHER_OPTION}>Otros (escribir)</option>
          </select>
          {subjectIsOther && (
            <input
              className="form-input"
              style={{ marginTop: 'var(--s-2)' }}
              value={form.subject}
              onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))}
              placeholder="Escribe la asignatura"
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Curso / etapa</label>
          <select
            className="form-select"
            value={stageIsOther ? OTHER_OPTION : form.stage}
            onChange={event => {
              const value = event.target.value
              if (value === OTHER_OPTION) {
                setStageIsOther(true)
                if (!form.stage) setForm(prev => ({ ...prev, stage: '' }))
                return
              }
              setStageIsOther(false)
              setForm(prev => ({ ...prev, stage: value }))
            }}
          >
            <option value="">Selecciona curso o etapa...</option>
            {stageOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value={OTHER_OPTION}>Otros (escribir)</option>
          </select>
          {stageIsOther && (
            <input
              className="form-input"
              style={{ marginTop: 'var(--s-2)' }}
              value={form.stage}
              onChange={event => setForm(prev => ({ ...prev, stage: event.target.value }))}
              placeholder="Escribe el curso o etapa"
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Tipo de actividad</label>
          <select
            className="form-select"
            value={activityIsOther ? OTHER_OPTION : form.activityType}
            onChange={event => {
              const value = event.target.value
              if (value === OTHER_OPTION) {
                setActivityIsOther(true)
                if (!form.activityType) setForm(prev => ({ ...prev, activityType: '' }))
                return
              }
              setActivityIsOther(false)
              setForm(prev => ({ ...prev, activityType: value }))
            }}
          >
            {activityOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value={OTHER_OPTION}>Otros (escribir)</option>
          </select>
          {activityIsOther && (
            <input
              className="form-input"
              style={{ marginTop: 'var(--s-2)' }}
              value={form.activityType}
              onChange={event => setForm(prev => ({ ...prev, activityType: event.target.value }))}
              placeholder="Escribe el tipo de actividad"
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Objetivo didactico</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={form.objective}
            onChange={event => setForm(prev => ({ ...prev, objective: event.target.value }))}
            placeholder="Que quieres conseguir con esta actividad"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Criterios / evidencias (coma, punto y coma o salto de linea)</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={form.evidence}
            onChange={event => setForm(prev => ({ ...prev, evidence: event.target.value }))}
            placeholder="Contenido, claridad, vocabulario, actitud"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Numero de criterios</label>
            <input
              type="number"
              min={3}
              max={8}
              className="form-input"
              value={form.criteriaCount}
              onChange={event => setForm(prev => ({ ...prev, criteriaCount: Number(event.target.value) }))}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Redondeo nota final</label>
            <select
              className="form-select"
              value={form.rounding}
              onChange={event => setForm(prev => ({ ...prev, rounding: event.target.value as RoundingMode }))}
            >
              <option value="0.1">0.1</option>
              <option value="0.5">0.5</option>
              <option value="1">Entero</option>
            </select>
          </div>
        </div>

        <div className="divider" />

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', marginBottom: 'var(--s-3)' }}>
          <button className="btn btn-secondary" onClick={() => applyPreset({ activityType: 'Exposicion oral', evidence: 'Contenido, estructura, expresion oral, vocabulario, actitud' })}>
            Preset oral
          </button>
          <button className="btn btn-secondary" onClick={() => applyPreset({ activityType: 'Trabajo escrito', evidence: 'Adecuacion, organizacion, correccion linguistica, vocabulario, presentacion' })}>
            Preset escrito
          </button>
          <button className="btn btn-secondary" onClick={() => applyPreset({ activityType: 'Proyecto', evidence: 'Planificacion, producto final, rigor, colaboracion, comunicacion' })}>
            Preset proyecto
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
          <button className="btn btn-primary w-full" onClick={generateTemplate}>
            Generar rubrica asistida
          </button>
        </div>
      </aside>

      <main className="studio-preview">
        <div className="studio-preview-header">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Vista previa editable</h3>
          {currentTemplate && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar plantilla'}
            </button>
          )}
        </div>

        {error && (
          <div style={{
            background: 'var(--color-danger-light)',
            color: 'var(--color-danger)',
            padding: 'var(--s-3)',
            margin: 'var(--s-3)',
            borderRadius: 'var(--r-md)',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {currentTemplate ? (
          <RubricPreview template={currentTemplate} editable onEdit={setCurrentTemplate} />
        ) : (
          <div className="studio-preview-empty">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--s-4)' }}>🧩</div>
            <p style={{ color: 'var(--color-muted)' }}>
              Completa el formulario de la izquierda y pulsa "Generar rubrica asistida".
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
