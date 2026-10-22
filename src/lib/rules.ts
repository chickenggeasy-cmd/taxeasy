import rules2568 from '../../rules/2568.json'
import rules2569 from '../../rules/2569.json'
import type { TaxRules } from '../engine/types'
import { readApiJson } from './server'
import { readJSON, writeJSON } from './storage'

/** กฎที่ติดมากับแอป ใช้ได้แม้ออฟไลน์หรือยังไม่ได้ต่อหลังบ้าน */
export const BUNDLED: TaxRules[] = [rules2568 as TaxRules, rules2569 as TaxRules]

const CACHE_KEY = 'taxeasy:rules'

export type RulesSource = 'bundled' | 'cached' | 'online'

export interface RulesState {
  byYear: Record<number, TaxRules>
  source: RulesSource
  checkedAt: string | null
  error: string | null
}

function isRules(x: unknown): x is TaxRules {
  const r = x as TaxRules
  return (
    !!r &&
    typeof r.taxYear === 'number' &&
    typeof r.revision === 'number' &&
    Array.isArray(r.brackets) &&
    r.brackets.length > 0 &&
    !!r.deductions &&
    !!r.expenses &&
    Array.isArray(r.measures)
  )
}

function merge(...lists: TaxRules[][]): Record<number, TaxRules> {
  const out: Record<number, TaxRules> = {}
  for (const list of lists) {
    for (const r of list) {
      if (!isRules(r)) continue
      const cur = out[r.taxYear]
      if (!cur || r.revision >= cur.revision) out[r.taxYear] = r
    }
  }
  return out
}

export function initialRules(): RulesState {
  const cached = readJSON<{ rules: TaxRules[]; checkedAt: string }>(CACHE_KEY)
  return {
    byYear: merge(BUNDLED, cached?.rules ?? []),
    source: cached ? 'cached' : 'bundled',
    checkedAt: cached?.checkedAt ?? null,
    error: null,
  }
}

/** ดึงกฎล่าสุดจากหลังบ้าน (api/rules.php) */
export async function fetchRules(current: RulesState): Promise<RulesState> {
  if (__PREVIEW__) return { ...current, error: 'ลิงก์ทดลองนี้ไม่ได้เชื่อมหลังบ้าน ใช้กฎที่ติดมากับแอป' }
  try {
    const res = await fetch('./api/rules.php', { cache: 'no-store' })
    const data = await readApiJson<{ ok: boolean; rules: unknown[] }>(res)
    if (!res.ok && !data.ok) throw new Error(`HTTP ${res.status}`)
    const rules = (data.rules ?? []).filter(isRules)
    if (!data.ok || rules.length === 0) throw new Error('ไม่มีข้อมูลกฎภาษี')
    const checkedAt = new Date().toISOString()
    writeJSON(CACHE_KEY, { rules, checkedAt })
    return { byYear: merge(BUNDLED, rules), source: 'online', checkedAt, error: null }
  } catch (e) {
    return { ...current, error: `เชื่อมต่อหลังบ้านไม่ได้: ${(e as Error).message} · ตอนนี้ใช้กฎที่บันทึกไว้ในเครื่องแทน` }
  }
}
