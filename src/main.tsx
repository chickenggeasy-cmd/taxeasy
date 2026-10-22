import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import { applySettings, loadSettings } from './lib/settings'

// ใช้ธีมที่ผู้ใช้เลือกไว้ก่อนวาดหน้าจอ จะได้ไม่กระพริบ
applySettings(loadSettings())

// แอปขึ้นแล้ว: ล้างธงกู้หน้าขาว เพื่อให้ช่วยได้อีกในครั้งหน้า
try {
  sessionStorage.removeItem('taxeasy:recovered')
} catch {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// PWA: ทำงานเฉพาะบน https หรือ localhost
if (!__PREVIEW__ && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
