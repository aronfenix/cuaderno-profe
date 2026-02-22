import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTemplates } from '../hooks/useTemplates'
import { TemplatesRepo } from '../db/repos/TemplatesRepo'
import { parseTemplateJSON, downloadJSON } from '../lib/jsonExport'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import type { InstrumentTemplate } from '../types'

export function Library() {
  const { templates, isLoading, duplicateTemplate, deleteTemplate } = useTemplates()
  const [deleteTarget, setDeleteTarget] = useState<InstrumentTemplate | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseTemplateJSON(text)
      if (parsed.length === 0) throw new Error('No se encontraron rúbricas válidas')
      await TemplatesRepo.importFromJSON(parsed)
      alert(`${parsed.length} rúbrica(s) importada(s)`)
    } catch (err) {
      alert('Error al importar: ' + (err as Error).message)
    }
    e.target.value = ''
  }

  const handleExportAll = async () => {
    const all = await TemplatesRepo.exportToJSON()
    downloadJSON(all, `rubricas-${new Date().toISOString().split('T')[0]}.json`)
  }

  if (isLoading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="section-header" style={{ marginBottom: 'var(--s-4)' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Biblioteca</h1>
        <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            ↑ JSON
          </button>
          <Link to="/studio" className="btn btn-primary">+ Crear</Link>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJSON} />

      {templates.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Sin rúbricas</div>
          <div className="empty-state-desc">Crea una rúbrica con IA o importa un JSON.</div>
          <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'center', marginTop: 'var(--s-4)' }}>
            <Link to="/studio" className="btn btn-primary">Rubric Studio</Link>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>Importar JSON</button>
          </div>
        </div>
      )}

      <div className="list">
        {templates.map(t => (
          <div key={t.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s-3)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.title}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 2 }}>
                  {t.criteria.length} criterios · {t.source === 'ai' ? '🤖 IA' : '✏️ Manual'} · v{t.version}
                </div>
                {t.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--s-1)', flexWrap: 'wrap', marginTop: 'var(--s-1)' }}>
                    {t.tags.map(tag => <span key={tag} className="chip" style={{ cursor: 'default', fontSize: '0.75rem' }}>{tag}</span>)}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}>
              <Link to={`/studio?edit=${t.id}`} className="btn btn-secondary" style={{ fontSize: '0.8125rem', padding: 'var(--s-2) var(--s-3)' }}>
                ✏️ Editar
              </Link>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem', padding: 'var(--s-2) var(--s-3)' }}
                onClick={() => duplicateTemplate(t.id!)}
              >
                📋 Duplicar
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem', padding: 'var(--s-2) var(--s-3)' }}
                onClick={() => downloadJSON([t], `${t.title.replace(/[^a-z0-9]/gi, '_')}.json`)}
              >
                ↓ JSON
              </button>
              <button
                className="btn btn-danger"
                style={{ fontSize: '0.8125rem', padding: 'var(--s-2) var(--s-3)' }}
                onClick={() => setDeleteTarget(t)}
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length > 0 && (
        <div style={{ marginTop: 'var(--s-4)', textAlign: 'center' }}>
          <button className="btn btn-ghost" onClick={handleExportAll}>
            Exportar todas las rúbricas
          </button>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Eliminar rúbrica"
          message={`¿Eliminar "${deleteTarget.title}"? Las evaluaciones existentes no se verán afectadas.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={async () => {
            await deleteTemplate(deleteTarget.id!)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
