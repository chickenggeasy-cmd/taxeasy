import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applySettings, loadSettings } from './lib/settings'

// ใช้ธีมที่ผู้ใช้เลือกไว้ก่อนวาดหน้าจอ จะได้ไม่กระพริบ
applySettings(loadSettings())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: ทำงานเฉพาะบน https หรือ localhost
if (!__PREVIEW__ && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
