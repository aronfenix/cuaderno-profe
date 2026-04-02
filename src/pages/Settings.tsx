import { useRef, useState, type ChangeEventHandler } from 'react'
import {
  downloadJSON,
  exportFullBackup,
  importFullBackup,
  isBackupPackage,
} from '../lib/jsonExport'
import { getLLMSettings, saveLLMSettings } from '../lib/llm/LLMProvider'
import {
  getCloudStatus,
  getCloudSyncSettings,
  restoreBackupFromCloud,
  saveCloudSyncSettings,
  uploadCurrentBackup,
} from '../lib/cloudSync'

export function Settings() {
  const [settings, setSettings] = useState(getLLMSettings)
  const [cloud, setCloud] = useState(getCloudSyncSettings)
  const [saved, setSaved] = useState(false)
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [backupWorking, setBackupWorking] = useState(false)
  const backupInputRef = useRef<HTMLInputElement | null>(null)

  const handleSaveLocalSettings = () => {
    saveLLMSettings(settings)
    saveCloudSyncSettings(cloud)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const runCloudAction = async (action: 'status' | 'upload' | 'download') => {
    if (!cloud.spaceId.trim() || !cloud.secret.trim()) {
      setCloudMessage('Define espacio docente y clave antes de usar la sincronizacion.')
      return
    }

    saveCloudSyncSettings(cloud)
    setWorking(true)
    setCloudMessage(null)

    try {
      if (action === 'status') {
        const status = await getCloudStatus(cloud.spaceId.trim())
        setCloudMessage(`Servidor OK. Ultima actualizacion: ${new Date(status.updatedAt).toLocaleString('es-ES')}`)
      }

      if (action === 'upload') {
        const status = await uploadCurrentBackup(cloud.spaceId.trim(), cloud.secret)
        setCloudMessage(`Copia subida correctamente. Fecha servidor: ${new Date(status.updatedAt).toLocaleString('es-ES')}`)
      }

      if (action === 'download') {
        const accepted = window.confirm('Esta accion reemplazara los datos locales por los del servidor. Deseas continuar?')
        if (!accepted) {
          setCloudMessage('Restauracion cancelada por el usuario.')
          setWorking(false)
          return
        }
        const status = await restoreBackupFromCloud(cloud.spaceId.trim(), cloud.secret)
        setCloudMessage(`Datos restaurados desde servidor (${new Date(status.updatedAt).toLocaleString('es-ES')}). Recarga la app para ver todo actualizado.`)
      }
    } catch (error) {
      setCloudMessage((error as Error).message)
    } finally {
      setWorking(false)
    }
  }

  const handleExportBackup = async () => {
    setBackupWorking(true)
    setBackupMessage(null)
    try {
      const backup = await exportFullBackup()
      downloadJSON(backup, `cuaderno-backup-${new Date().toISOString().slice(0, 10)}.json`)
      setBackupMessage('Backup exportado correctamente.')
    } catch (error) {
      setBackupMessage((error as Error).message)
    } finally {
      setBackupWorking(false)
    }
  }

  const handleImportBackup: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBackupWorking(true)
    setBackupMessage(null)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!isBackupPackage(parsed)) {
        throw new Error('El archivo no tiene formato de backup completo.')
      }

      const accepted = window.confirm('Se reemplazaran todos los datos actuales por los del backup. Continuar?')
      if (!accepted) {
        setBackupMessage('Importacion cancelada por el usuario.')
        return
      }

      await importFullBackup(parsed)
      setBackupMessage('Backup importado correctamente. Recargando app...')
      window.setTimeout(() => window.location.reload(), 700)
    } catch (error) {
      setBackupMessage((error as Error).message)
    } finally {
      setBackupWorking(false)
      event.target.value = ''
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Ajustes</h1>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-4)' }}>Migracion y backup local</h2>

        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', marginBottom: 'var(--s-3)' }}>
          Si quieres conservar los datos del proyecto antiguo, exporta alli un backup JSON y cargalo aqui.
        </p>

        <input
          ref={backupInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleImportBackup}
        />

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" disabled={backupWorking} onClick={handleExportBackup}>
            Exportar backup JSON
          </button>
          <button className="btn btn-primary" disabled={backupWorking} onClick={() => backupInputRef.current?.click()}>
            Importar backup JSON
          </button>
        </div>

        {backupMessage && (
          <p style={{ marginTop: 'var(--s-3)', fontSize: '0.875rem', color: 'var(--color-text-2)' }}>
            {backupMessage}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-4)' }}>Sincronizacion con servidor</h2>

        <div className="form-group">
          <label className="form-label">Espacio docente</label>
          <input
            className="form-input"
            value={cloud.spaceId}
            onChange={event => setCloud(prev => ({ ...prev, spaceId: event.target.value }))}
            placeholder="ej: ceip-peru-6primaria"
          />
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 'var(--s-1)' }}>
            Identificador compartido para tu cuaderno en servidor.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Clave del espacio</label>
          <input
            type="password"
            className="form-input"
            value={cloud.secret}
            onChange={event => setCloud(prev => ({ ...prev, secret: event.target.value }))}
            placeholder="minimo 6 caracteres"
            autoComplete="off"
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" disabled={working} onClick={() => runCloudAction('status')}>
            Comprobar estado
          </button>
          <button className="btn btn-primary" disabled={working} onClick={() => runCloudAction('upload')}>
            Subir copia local
          </button>
          <button className="btn btn-danger" disabled={working} onClick={() => runCloudAction('download')}>
            Descargar y restaurar
          </button>
        </div>

        {cloudMessage && (
          <p style={{ marginTop: 'var(--s-3)', fontSize: '0.875rem', color: 'var(--color-text-2)' }}>
            {cloudMessage}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-4)' }}>Proveedor IA (opcional)</h2>

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
        </div>

        <div className="form-group">
          <label className="form-label">Modelo</label>
          <select
            className="form-select"
            value={settings.model}
            onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
          >
            <option value="claude-3-5-haiku-20241022">claude-3-5-haiku (rapido)</option>
            <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (equilibrado)</option>
            <option value="claude-opus-4-6">claude-opus-4 (maxima calidad)</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleSaveLocalSettings}>
          {saved ? 'Guardado' : 'Guardar ajustes'}
        </button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-3)' }}>Acerca de</h2>
        <p style={{ color: 'var(--color-text-2)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <strong>Cuaderno del Profe x100</strong><br />
          Gestion docente con rubricas asistidas, importador de grupos/alumnos,
          analitica de medias y sincronizacion con servidor.
        </p>
      </div>
    </div>
  )
}


