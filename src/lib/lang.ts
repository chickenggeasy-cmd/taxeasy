// ภาษาของหน้าจอ (ไทย / English) เก็บในเครื่องผู้ใช้ และแจ้งทุกหน้าจอที่ใช้ภาษาเมื่อเปลี่ยน
import { useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from './storage'

export type Lang = 'th' | 'en'

const KEY = 'taxeasy:lang'
const listeners = new Set<() => void>()

let current: Lang = readJSON<string>(KEY) === 'en' ? 'en' : 'th'

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getLang(): Lang {
  return current
}

/** ตั้งภาษา แล้วบอกหน้าจอให้วาดใหม่ */
export function setLang(lang: Lang): void {
  if (lang === current) return
  current = lang
  writeJSON(KEY, lang)
  applyLang()
  listeners.forEach((fn) => fn())
}

/** ให้เบราว์เซอร์และเครื่องอ่านหน้าจอรู้ภาษาที่แสดง */
export function applyLang(): void {
  document.documentElement.lang = current === 'en' ? 'en' : 'th'
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}

/** ใช้ในคอมโพเนนต์: t('ภาษาไทย', 'English') */
export function useT(): (th: string, en: string) => string {
  const lang = useLang()
  return (th, en) => (lang === 'en' ? en : th)
}
