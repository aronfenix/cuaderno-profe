/**
 * Production proxy server for Anthropic API calls.
 * Usage: ANTHROPIC_API_KEY=sk-ant-... node server.js
 *
 * In dev: Vite proxy handles /api/claude → https://api.anthropic.com
 * In prod: This file proxies /api/claude and serves the Vite build.
 */
import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const DIST_DIR = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  // CORS headers for API routes
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Proxy Anthropic API calls
  if (req.url?.startsWith('/api/claude/')) {
    const targetPath = req.url.replace('/api/claude', '')
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: targetPath,
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        }
      }
      const proxyReq = https.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode || 200, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        })
        proxyRes.pipe(res)
      })
      proxyReq.on('error', err => {
        res.writeHead(502)
        res.end(JSON.stringify({ error: err.message }))
      })
      if (body) proxyReq.write(body)
      proxyReq.end()
    })
    return
  }

  // Serve static files from dist/
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url || '')
  if (!fs.existsSync(filePath)) filePath = path.join(DIST_DIR, 'index.html') // SPA fallback

  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'
  res.setHeader('Content-Type', contentType)

  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache')
  } else if (['.js', '.css', '.png', '.woff2'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`Cuaderno del Profe server running at http://localhost:${PORT}`)
  if (!ANTHROPIC_API_KEY) console.warn('⚠️  ANTHROPIC_API_KEY not set — LLM features will not work')
})
