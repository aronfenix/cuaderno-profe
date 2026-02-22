import { useState } from 'react'
import { getLLMSettings, saveLLMSettings } from '../lib/llm/LLMProvider'

export function Settings() {
  const [settings, setSettings] = useState(getLLMSettings)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveLLMSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <h1 className="page-title">Ajustes</h1>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-4)' }}>🤖 Rubric Studio (Anthropic Claude)</h2>

        <div className="form-group">
          <label className="form-label">API Key de Anthropic</label>
          <input
            type="password"
            className="form-input"
            value={settings.anthropicApiKey}
            onChange={e => setSettings(s => ({ ...s, anthropicApiKey: e.target.value }))}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 'var(--s-1)' }}>
            La clave se guarda en este dispositivo y se usa a través del proxy local.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Modelo</label>
          <select
            className="form-select"
            value={settings.model}
            onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
          >
            <option value="claude-3-5-haiku-20241022">claude-3-5-haiku (rápido, económico)</option>
            <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (más capaz)</option>
            <option value="claude-opus-4-6">claude-opus-4 (mejor calidad)</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Guardado' : 'Guardar'}
        </button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-3)' }}>ℹ️ Acerca de</h2>
        <p style={{ color: 'var(--color-text-2)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <strong>Cuaderno del Profe</strong> v0.1.0<br />
          Evaluación con rúbricas offline para docentes.<br />
          Todos los datos se guardan en este dispositivo.
        </p>
      </div>
    </div>
  )
}
