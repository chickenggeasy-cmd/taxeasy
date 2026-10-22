import { readJSON, writeJSON } from './storage'

export type ThemeSetting = 'system' | 'light' | 'dark'
/** none = สีปกติ, rg = ตาบอดสีแดง-เขียว, by = ตาบอดสีน้ำเงิน-เหลือง */
export type ColorVisionSetting = 'none' | 'rg' | 'by'

export interface DisplaySettings {
  theme: ThemeSetting
  colorVision: ColorVisionSetting
}

const KEY = 'taxeasy:display'
const DEFAULTS: DisplaySettings = { theme: 'system', colorVision: 'none' }

export function loadSettings(): DisplaySettings {
  return { ...DEFAULTS, ...readJSON<Partial<DisplaySettings>>(KEY) }
}

export function saveSettings(s: DisplaySettings): void {
  writeJSON(KEY, s)
  applySettings(s)
}

/** ตั้งค่า data-theme / data-cvd บน <html> ให้ CSS เปลี่ยนชุดสีตาม */
export function applySettings(s: DisplaySettings): void {
  const root = document.documentElement
  if (s.theme === 'system') {
    // ลบเฉพาะค่าที่แอปตั้งเอง (หน้าเว็บที่ฝังแอปไว้อาจตั้ง data-theme มาให้แล้ว)
    if (root.dataset.themeByApp) {
      delete root.dataset.theme
      delete root.dataset.themeByApp
    }
  } else {
    root.dataset.theme = s.theme
    root.dataset.themeByApp = '1'
  }
  if (s.colorVision === 'none') delete root.dataset.cvd
  else root.dataset.cvd = s.colorVision
}
