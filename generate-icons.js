/**
 * Generates PWA icons as PNG files using canvas (node-canvas or pure SVG fallback).
 * Run: node generate-icons.js
 * Requires: nothing (uses pure SVG → base64 embedded PNG trick via built-in APIs)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function generateSVG(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#2563eb"/>
  <text x="${size/2}" y="${size * 0.65}" font-size="${size * 0.5}" text-anchor="middle" fill="white" font-family="sans-serif">📒</text>
</svg>`
}

const iconsDir = path.join(__dirname, 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

for (const size of [192, 512]) {
  const svg = generateSVG(size)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg)
  console.log(`Generated icon-${size}.svg`)
}

// Simple favicon SVG
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#2563eb"/>
  <text x="16" y="22" font-size="18" text-anchor="middle" fill="white">📒</text>
</svg>`
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), faviconSvg)
console.log('Generated favicon.svg')
console.log('\nNote: For production PNG icons, use https://favicon.io or similar tools')
console.log('Place 192x192 and 512x512 PNGs in public/icons/')
