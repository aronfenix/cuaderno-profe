import { useState } from 'react'
import type { InstrumentTemplate, Criterion, Descriptors, RoundingMode } from '../../types'
import './RubricPreview.css'

interface RubricPreviewProps {
  template: InstrumentTemplate
  editable?: boolean
  onEdit?: (updated: InstrumentTemplate) => void
}

export function RubricPreview({ template, editable = false, onEdit }: RubricPreviewProps) {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null)

  const update = (patch: Partial<InstrumentTemplate>) => {
    onEdit?.({ ...template, ...patch })
  }

  const updateCriterion = (id: string, patch: Partial<Criterion>) => {
    const criteria = template.criteria.map(c => c.id === id ? { ...c, ...patch } : c)
    update({ criteria })
  }

  const addCriterion = () => {
    const newId = crypto.randomUUID()
    const equalWeight = 1 / (template.criteria.length + 1)
    const criteria: Criterion[] = [
      ...template.criteria.map(c => ({ ...c, weight: equalWeight })),
      {
        id: newId,
        titleShort: 'Nuevo criterio',
        weight: equalWeight,
        descriptors: { 1: '', 2: '', 3: '', 4: '', 5: '' },
      }
    ]
    update({ criteria })
    setExpandedCriterion(newId)
  }

  const removeCriterion = (id: string) => {
    const remaining = template.criteria.filter(c => c.id !== id)
    if (remaining.length === 0) { update({ criteria: [] }); return }
    const totalW = remaining.reduce((a, c) => a + c.weight, 0)
    const criteria = remaining.map(c => ({ ...c, weight: c.weight / totalW }))
    update({ criteria })
  }

  const weightSum = template.criteria.reduce((a, c) => a + c.weight, 0)
  const weightsOk = Math.abs(weightSum - 1) < 0.02

  return (
    <div className="rubric-preview">
      {/* Header */}
      {editable ? (
        <div className="rp-field">
          <input
            className="form-input rp-title-input"
            value={template.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="Título de la rúbrica"
          />
          <textarea
            className="form-textarea"
            value={template.description}
            onChange={e => update({ description: e.target.value })}
            placeholder="Descripción (opcional)"
            rows={2}
          />
        </div>
      ) : (
        <div className="rp-header">
          <h2 className="rp-title">{template.title || '(Sin título)'}</h2>
          {template.description && <p className="rp-desc">{template.description}</p>}
        </div>
      )}

      {/* Weight warning */}
      {editable && !weightsOk && (
        <div className="rp-warning">
          ⚠️ Los pesos suman {(weightSum * 100).toFixed(0)}% (deben sumar 100%)
        </div>
      )}

      {/* Settings row */}
      {editable && (
        <div className="rp-settings">
          <label className="form-label">Redondeo</label>
          <select
            className="form-select"
            value={template.finalGrade?.rounding ?? '0.5'}
            onChange={e => update({ finalGrade: { ...template.finalGrade, rounding: e.target.value as RoundingMode } })}
          >
            <option value="0.1">0.1 (9.3)</option>
            <option value="0.5">0.5 (9.5)</option>
            <option value="1">Entero (9)</option>
          </select>
        </div>
      )}

      {/* Criteria list */}
      <div className="rp-criteria">
        {template.criteria.length === 0 && (
          <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: 'var(--s-6) 0' }}>
            Sin criterios todavía
          </p>
        )}
        {template.criteria.map((c, idx) => (
          <CriterionEditor
            key={c.id}
            criterion={c}
            index={idx + 1}
            total={template.criteria.length}
            editable={editable}
            expanded={expandedCriterion === c.id}
            onToggle={() => setExpandedCriterion(prev => prev === c.id ? null : c.id)}
            onChange={patch => updateCriterion(c.id, patch)}
            onRemove={() => removeCriterion(c.id)}
          />
        ))}
      </div>

      {editable && (
        <button className="btn btn-secondary w-full mt-4" onClick={addCriterion}>
          + Añadir criterio
        </button>
      )}

      {/* Weights display (readonly) */}
      {!editable && template.criteria.length > 0 && (
        <div className="rp-weights">
          {template.criteria.map(c => (
            <div key={c.id} className="rp-weight-bar-row">
              <span className="rp-weight-label">{c.titleShort}</span>
              <div className="rp-weight-bar-bg">
                <div className="rp-weight-bar" style={{ width: `${(c.weight * 100).toFixed(0)}%` }} />
              </div>
              <span className="rp-weight-pct">{(c.weight * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface CriterionEditorProps {
  criterion: Criterion
  index: number
  total: number
  editable: boolean
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<Criterion>) => void
  onRemove: () => void
}

function CriterionEditor({ criterion, index, total, editable, expanded, onToggle, onChange, onRemove }: CriterionEditorProps) {
  return (
    <div className={`rp-criterion ${expanded ? 'expanded' : ''}`}>
      <div className="rp-criterion-header" onClick={onToggle}>
        <div className="rp-criterion-num">{index}</div>
        <div className="rp-criterion-info">
          <div className="rp-criterion-title">
            {editable ? (
              <input
                className="form-input rp-criterion-title-input"
                value={criterion.titleShort}
                onChange={e => onChange({ titleShort: e.target.value })}
                onClick={e => e.stopPropagation()}
                placeholder="Nombre del criterio"
              />
            ) : criterion.titleShort}
          </div>
          <div className="rp-criterion-weight">
            {editable ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-1)', marginTop: 'var(--s-1)' }}>
                <input
                  type="number"
                  min="1" max="100"
                  className="rp-weight-input"
                  value={Math.round(criterion.weight * 100)}
                  onChange={e => onChange({ weight: Number(e.target.value) / 100 })}
                  onClick={e => e.stopPropagation()}
                />
                <span style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>%</span>
              </div>
            ) : (
              <span>{(criterion.weight * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
          {editable && (
            <button
              className="btn-icon"
              style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}
              onClick={e => { e.stopPropagation(); onRemove() }}
              title="Eliminar criterio"
            >
              🗑
            </button>
          )}
          <span className="rp-expand-icon">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="rp-criterion-body">
          {editable && (
            <div className="form-group" style={{ marginBottom: 'var(--s-3)' }}>
              <label className="form-label">Texto de ayuda (opcional)</label>
              <input
                className="form-input"
                value={criterion.helpText ?? ''}
                onChange={e => onChange({ helpText: e.target.value })}
                placeholder="Descripción adicional para el evaluador"
              />
            </div>
          )}

          <div className="rp-descriptors">
            {([5, 4, 3, 2, 1] as const).map(level => (
              <div key={level} className="rp-descriptor-row">
                <div className="rp-desc-level" style={{ background: LEVEL_BG[level] }}>
                  {level}
                </div>
                {editable ? (
                  <textarea
                    className="rp-desc-input"
                    value={criterion.descriptors[level] ?? ''}
                    onChange={e => onChange({
                      descriptors: { ...criterion.descriptors, [level]: e.target.value } as Descriptors
                    })}
                    placeholder={`Nivel ${level}...`}
                    rows={2}
                  />
                ) : (
                  <p className="rp-desc-text">{criterion.descriptors[level]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const LEVEL_BG: Record<number, string> = {
  1: '#fca5a5', 2: '#fdba74', 3: '#fde68a', 4: '#6ee7b7', 5: '#34d399'
}
