import { describe, expect, it } from 'vitest'
import rules2569 from '../../rules/2569.json'
import rules2568 from '../../rules/2568.json'
import { calculateTax } from './calculate'
import { EXAMPLE_IDS, EXAMPLES } from './examples'
import type { TaxRules } from './types'

describe('ข้อมูลตัวอย่าง', () => {
  for (const [year, rules] of [
    [2568, rules2568],
    [2569, rules2569],
  ] as const) {
    it(`ทุกแบบคำนวณได้ ไม่มีคำเตือน (${year})`, () => {
      const results = EXAMPLE_IDS.map((id) => calculateTax(EXAMPLES[id].build(year, rules as unknown as TaxRules), rules as unknown as TaxRules))
      for (const r of results) {
        expect(r.tax).toBeGreaterThan(0)
        expect(r.warnings).toEqual([])
      }
      // เดโมควรมีทั้งแบบได้เงินคืนและแบบต้องจ่ายเพิ่ม
      expect(results.some((r) => r.balance < 0)).toBe(true)
      expect(results.some((r) => r.balance > 0)).toBe(true)
    })
  }
})
