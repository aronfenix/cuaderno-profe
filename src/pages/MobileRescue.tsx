import { useState } from 'react'
import { db } from '../db/schema'
import {
  DEFAULT_CLOUD_API_BASE_URL,
  getCloudSyncSettings,
  resetLocalDatabaseFromCloud,
  saveCloudSyncSettings,
} from '../lib/cloudSync'

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

export function MobileRescue() {
  const [cloud, setCloud] = useState(() => {
    const settings = getCloudSyncSettings()
    return {
      apiBaseUrl: settings.apiBaseUrl || DEFAULT_CLOUD_API_BASE_URL,
      spaceId: settings.spaceId,
      secret: settings.secret,
    }
  })
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const saveSettings = () => {
    saveCloudSyncSettings(cloud)
    setMessage('Claves guardadas en este dispositivo.')
  }

  const restoreFromServer = async () => {
    if (!cloud.spaceId.trim() || !cloud.secret.trim()) {
      setMessage('Escribe el espacio docente y la clave antes de restaurar.')
      return
    }

    setWorking(true)
    setMessage('Restaurando desde servidor...')
    try {
      saveCloudSyncSettings(cloud)
      await resetLocalDatabaseFromCloud(cloud.spaceId.trim(), cloud.secret, cloud.apiBaseUrl)
      setMessage('Datos recuperados. Recargando app...')
      window.setTimeout(() => {
        window.location.hash = '#/'
        window.location.reload()
      }, 900)
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setWorking(false)
    }
  }

  const wipeLocalAndReload = async () => {
    setWorking(true)
    setMessage('Limpiando datos locales de este navegador...')
    try {
      saveCloudSyncSettings(cloud)
      db.close()
      await deleteIndexedDb('CuadernoProfe')
      localStorage.removeItem('cuaderno_initialized')
      setMessage('Dispositivo limpio. Recargando para recuperar desde servidor...')
      window.setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <h1 className="page-title">Recuperar movil</h1>
      <p style={{ color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 'var(--s-4)' }}>
        Usa esta pantalla si la app se queda cargando, aparece vacia o el movil no coincide con el PC.
        No toca el servidor: solo arregla este dispositivo.
      </p>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <div className="form-group">
          <label className="form-label">URL base del servidor</label>
          <input
            className="form-input"
            value={cloud.apiBaseUrl}
            onChange={event => setCloud(prev => ({ ...prev, apiBaseUrl: event.target.value }))}
            placeholder={DEFAULT_CLOUD_API_BASE_URL}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Espacio docente</label>
          <input
            className="form-input"
            value={cloud.spaceId}
            onChange={event => setCloud(prev => ({ ...prev, spaceId: event.target.value }))}
            placeholder="peru_2025_sexto"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Clave</label>
          <input
            className="form-input"
            type="password"
            value={cloud.secret}
            onChange={event => setCloud(prev => ({ ...prev, secret: event.target.value }))}
            autoComplete="off"
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" disabled={working} onClick={saveSettings}>
            Guardar claves
          </button>
          <button className="btn btn-primary" disabled={working} onClick={restoreFromServer}>
            {working ? 'Trabajando...' : 'Recuperar desde servidor'}
          </button>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'rgba(220, 38, 38, 0.22)' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--s-2)' }}>Si sigue atascado</h2>
        <p style={{ color: 'var(--color-text-2)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 'var(--s-3)' }}>
          Borra solo la base local de este navegador y recarga. Si las claves estan puestas,
          al volver a entrar se reconstruye con la copia buena del servidor.
        </p>
        <button className="btn btn-danger" disabled={working} onClick={wipeLocalAndReload}>
          Limpiar este movil y reintentar
        </button>
      </div>

      {message && (
        <p style={{ marginTop: 'var(--s-4)', color: 'var(--color-text-2)', fontWeight: 700 }}>
          {message}
        </p>
      )}
    </div>
  )
}
