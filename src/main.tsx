import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { seedDemoData } from './db/seed'
import './styles/global.css'

// Safety: remove stale PWA service workers/cache that can break local upgrades.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(console.error)

    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .catch(console.error)
    }
  })
}

// Seed demo data on first launch
seedDemoData().catch(console.error)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
