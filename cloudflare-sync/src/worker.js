/**
 * Cloudflare Worker API for Cuaderno Profe sync.
 * Endpoints:
 * - GET  /api/health
 * - POST /api/cloud/save
 * - GET  /api/cloud/load?spaceId=...&secret=...
 * - GET  /api/cloud/status?spaceId=...
 */

const SPACE_ID_REGEX = /^[a-zA-Z0-9._-]{3,80}$/
const MAX_BODY_BYTES = 10 * 1024 * 1024
const MAX_BACKUP_CHARS = 8 * 1024 * 1024

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      ...extraHeaders,
    },
  })
}

function isValidSpaceId(spaceId) {
  return typeof spaceId === 'string' && SPACE_ID_REGEX.test(spaceId)
}

async function hashSecret(secret) {
  const bytes = new TextEncoder().encode(secret)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    throw new Error('Body too large')
  }
  const text = await request.text()
  if (!text.trim()) return {}
  return JSON.parse(text)
}

function badRequest(message) {
  return json({ error: message }, 400)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'content-type',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        },
      })
    }

    if (request.method === 'GET' && pathname === '/api/health') {
      return json({ ok: true, serverTime: Date.now(), provider: 'cloudflare-worker-d1' })
    }

    if (request.method === 'POST' && pathname === '/api/cloud/save') {
      try {
        const payload = await parseJsonBody(request)
        const { spaceId, secret, backup } = payload

        if (!isValidSpaceId(spaceId)) {
          return badRequest('spaceId invalido (3-80, letras/numeros/._-)')
        }
        if (typeof secret !== 'string' || secret.length < 6) {
          return badRequest('secret invalido (minimo 6 caracteres)')
        }
        if (!backup || typeof backup !== 'object') {
          return badRequest('backup invalido')
        }

        const backupJson = JSON.stringify(backup)
        if (backupJson.length > MAX_BACKUP_CHARS) {
          return json({ error: 'Backup demasiado grande para sincronizacion cloud' }, 413)
        }

        const secretHash = await hashSecret(secret)
        const existing = await env.DB
          .prepare('SELECT secret_hash FROM cloud_spaces WHERE space_id = ?1')
          .bind(spaceId)
          .first()

        if (existing && existing.secret_hash !== secretHash) {
          return json({ error: 'Clave incorrecta para este espacio docente' }, 403)
        }

        const updatedAt = Date.now()
        await env.DB
          .prepare(`
            INSERT INTO cloud_spaces (space_id, secret_hash, updated_at, backup_json)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(space_id) DO UPDATE SET
              secret_hash = excluded.secret_hash,
              updated_at = excluded.updated_at,
              backup_json = excluded.backup_json
          `)
          .bind(spaceId, secretHash, updatedAt, backupJson)
          .run()

        return json({ ok: true, spaceId, updatedAt })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'error'
        if (message.includes('JSON')) {
          return badRequest('JSON invalido')
        }
        return json({ error: `No se pudo guardar: ${message}` }, 500)
      }
    }

    if (request.method === 'GET' && pathname === '/api/cloud/load') {
      const spaceId = url.searchParams.get('spaceId') || ''
      const secret = url.searchParams.get('secret') || ''

      if (!isValidSpaceId(spaceId)) {
        return badRequest('spaceId invalido')
      }
      if (secret.length < 6) {
        return badRequest('secret invalido')
      }

      const row = await env.DB
        .prepare('SELECT secret_hash, updated_at, backup_json FROM cloud_spaces WHERE space_id = ?1')
        .bind(spaceId)
        .first()

      if (!row) {
        return json({ error: 'No existe ese espacio docente en el servidor' }, 404)
      }

      if (row.secret_hash !== await hashSecret(secret)) {
        return json({ error: 'Clave incorrecta' }, 403)
      }

      let backup
      try {
        backup = JSON.parse(row.backup_json)
      } catch {
        return json({ error: 'Backup almacenado corrupto' }, 500)
      }

      return json({
        ok: true,
        spaceId,
        updatedAt: Number(row.updated_at),
        backup,
      })
    }

    if (request.method === 'GET' && pathname === '/api/cloud/status') {
      const spaceId = url.searchParams.get('spaceId') || ''
      if (!isValidSpaceId(spaceId)) {
        return badRequest('spaceId invalido')
      }

      const row = await env.DB
        .prepare('SELECT updated_at FROM cloud_spaces WHERE space_id = ?1')
        .bind(spaceId)
        .first()

      if (!row) {
        return json({ error: 'No existe ese espacio docente' }, 404)
      }

      return json({ ok: true, spaceId, updatedAt: Number(row.updated_at) })
    }

    return json({ error: 'Ruta no encontrada' }, 404)
  },
}
