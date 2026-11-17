// สำรอง/กู้คืนข้อมูลที่ผู้ใช้กรอก (ทุกปีภาษี + การตั้งค่า) เป็นไฟล์ JSON
import { BilingualError } from './server'

const PREFIXES = ['taxeasy:input:', 'taxeasy:docs:', 'taxeasy:display', 'taxeasy:year']

interface BackupFile {
  app: 'taxeasy'
  version: 1
  exportedAt: string
  data: Record<string, unknown>
}

const ours = (key: string) => PREFIXES.some((p) => key.startsWith(p))

export function createBackup(): BackupFile {
  const data: Record<string, unknown> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !ours(key)) continue
      const raw = localStorage.getItem(key)
      if (raw !== null) data[key] = JSON.parse(raw)
    }
  } catch {
    // อ่านไม่ได้ก็ส่งออกเท่าที่ได้
  }
  return { app: 'taxeasy', version: 1, exportedAt: new Date().toISOString(), data }
}

export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `taxeasy-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** คืนจำนวนรายการที่กู้คืน หรือโยน BilingualError (ไทย + อังกฤษ) */
export function restoreBackup(text: string): number {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BilingualError('ไฟล์นี้ไม่ใช่ไฟล์สำรองของภาษีง่ายๆ', 'This is not a TaxEasy backup file')
  }
  if (parsed?.app !== 'taxeasy' || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new BilingualError('ไฟล์นี้ไม่ใช่ไฟล์สำรองของภาษีง่ายๆ', 'This is not a TaxEasy backup file')
  }
  const entries = Object.entries(parsed.data).filter(([k]) => ours(k))
  if (entries.length === 0) throw new BilingualError('ไฟล์สำรองนี้ไม่มีข้อมูล', 'This backup file has no data')
  try {
    for (const [k, v] of entries) localStorage.setItem(k, JSON.stringify(v))
  } catch {
    throw new BilingualError('เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกข้อมูล ลองปิดโหมดไม่ระบุตัวตน', 'This browser does not allow saving data. Try turning off private browsing.')
  }
  return entries.length
}
