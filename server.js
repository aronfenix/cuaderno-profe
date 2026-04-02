/**
 * Production server:
 * - Serves Vite dist build
 * - Proxies Anthropic API requests
 * - Stores/retrieves cloud backups for teacher sync
 *
 * Usage: node server.js
 * Optional env: ANTHROPIC_API_KEY
 */
import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3000)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const DIST_DIR = path.join(__dirname, 'dist')
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const CLOUD_FILE = path.join(DATA_DIR, 'cloud-sync.json')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

/**
 * @typedef {{
 *   secretHash: string,
 *   updatedAt: number,
 *   backup: unknown
 * }} CloudSpace
 *
 * @typedef {{
 *   version: '1.0',
 *   spaces: Record<string, CloudSpace>
 * }} CloudStore
 */

ensureCloudStore()

function ensureCloudStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(CLOUD_FILE)) {
    const initial = { version: '1.0', spaces: {} }
    fs.writeFileSync(CLOUD_FILE, JSON.stringify(initial, null, 2), 'utf-8')
  }
}

/**
 * @returns {CloudStore}
 */
function readCloudStore() {
  ensureCloudStore()
  try {
    const raw = fs.readFileSync(CLOUD_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed?.version === '1.0' && parsed?.spaces && typeof parsed.spaces === 'object') {
      return parsed
    }
  } catch {
    // fall through and return a fresh store
  }
  return { version: '1.0', spaces: {} }
}

/**
 * @param {CloudStore} store
 */
function writeCloudStore(store) {
  fs.writeFileSync(CLOUD_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

/**
 * @param {string} secret
 */
function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function parseJsonBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      body += chunk.toString()
    })
    req.on('end', () => {
      if (!body.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function validateSpaceId(spaceId) {
  return typeof spaceId === 'string' && /^[a-zA-Z0-9._-]{3,80}$/.test(spaceId)
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = reqUrl.pathname

  // CORS for API routes
  if (pathname.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
  }

  // Health
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, serverTime: Date.now() })
    return
  }

  // Cloud sync save
  if (req.method === 'POST' && pathname === '/api/cloud/save') {
    try {
      const body = await parseJsonBody(req)
      const { spaceId, secret, backup } = body

      if (!validateSpaceId(spaceId)) {
        sendJson(res, 400, { error: 'spaceId invalido (3-80, letras/numeros/._-)' })
        return
      }
      if (typeof secret !== 'string' || secret.length < 6) {
        sendJson(res, 400, { error: 'secret invalido (minimo 6 caracteres)' })
        return
      }
      if (!backup || typeof backup !== 'object') {
        sendJson(res, 400, { error: 'backup invalido' })
        return
      }

      const store = readCloudStore()
      const secretHash = hashSecret(secret)
      const existing = store.spaces[spaceId]

      if (existing && existing.secretHash !== secretHash) {
        sendJson(res, 403, { error: 'Clave incorrecta para este espacio docente' })
        return
      }

      const updatedAt = Date.now()
      store.spaces[spaceId] = { secretHash, updatedAt, backup }
      writeCloudStore(store)

      sendJson(res, 200, { ok: true, spaceId, updatedAt })
    } catch (err) {
      sendJson(res, 500, { error: `No se pudo guardar: ${err instanceof Error ? err.message : 'error'}` })
    }
    return
  }

  // Cloud sync load
  if (req.method === 'GET' && pathname === '/api/cloud/load') {
    const spaceId = reqUrl.searchParams.get('spaceId') || ''
    const secret = reqUrl.searchParams.get('secret') || ''

    if (!validateSpaceId(spaceId)) {
      sendJson(res, 400, { error: 'spaceId invalido' })
      return
    }
    if (secret.length < 6) {
      sendJson(res, 400, { error: 'secret invalido' })
      return
    }

    const store = readCloudStore()
    const space = store.spaces[spaceId]
    if (!space) {
      sendJson(res, 404, { error: 'No existe ese espacio docente en el servidor' })
      return
    }
    if (space.secretHash !== hashSecret(secret)) {
      sendJson(res, 403, { error: 'Clave incorrecta' })
      return
    }

    sendJson(res, 200, {
      ok: true,
      spaceId,
      updatedAt: space.updatedAt,
      backup: space.backup,
    })
    return
  }

  // Cloud sync status
  if (req.method === 'GET' && pathname === '/api/cloud/status') {
    const spaceId = reqUrl.searchParams.get('spaceId') || ''
    if (!validateSpaceId(spaceId)) {
      sendJson(res, 400, { error: 'spaceId invalido' })
      return
    }
    const store = readCloudStore()
    const space = store.spaces[spaceId]
    if (!space) {
      sendJson(res, 404, { error: 'No existe ese espacio docente' })
      return
    }
    sendJson(res, 200, { ok: true, spaceId, updatedAt: space.updatedAt })
    return
  }

  // Proxy Anthropic API calls
  if (pathname.startsWith('/api/claude/')) {
    const targetPath = pathname.replace('/api/claude', '') + reqUrl.search
    let body = ''

    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      const runtimeApiKey = ANTHROPIC_API_KEY || String(req.headers['x-api-key'] || '')

      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: targetPath,
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': runtimeApiKey,
          'anthropic-version': String(req.headers['anthropic-version'] || '2023-06-01'),
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      }

      const proxyReq = https.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode || 200, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        })
        proxyRes.pipe(res)
      })

      proxyReq.on('error', err => {
        sendJson(res, 502, { error: err.message })
      })

      if (body) proxyReq.write(body)
      proxyReq.end()
    })
    return
  }

  // Serve static files from dist/
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname)

  // Base path fallback for GH Pages style route
  if (!fs.existsSync(filePath) && pathname.startsWith('/cuaderno-profe/')) {
    const strippedPath = pathname.replace('/cuaderno-profe/', '')
    filePath = path.join(DIST_DIR, strippedPath || 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'
  res.setHeader('Content-Type', contentType)

  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache')
  } else if (['.js', '.css', '.png', '.woff2', '.svg'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`Cuaderno del Profe running at http://localhost:${PORT}`)
  if (!ANTHROPIC_API_KEY) {
    console.log('Info: ANTHROPIC_API_KEY not set, cloud sync still available.')
  }
})
