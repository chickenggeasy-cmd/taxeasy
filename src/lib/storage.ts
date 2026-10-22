// localStorage อาจใช้ไม่ได้ (โหมดไม่ระบุตัวตน ปิดคุกกี้) จึงห่อด้วย try/catch ทุกครั้ง

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // เก็บไม่ได้ก็ใช้งานต่อได้ แค่ไม่จำข้อมูล
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
