import { describe, expect, it } from 'vitest'
import rules2568 from '../../rules/2568.json'
import { calculateTax } from '../engine/calculate'
import { emptyInput } from '../engine/defaults'
import type { TaxRules } from '../engine/types'
import { documentChecklist, filingSteps, formType } from './filing'

const R = rules2568 as TaxRules

describe('คู่มือยื่นภาษี', () => {
  it('เงินเดือนอย่างเดียวใช้ ภ.ง.ด.91 มีรายได้อื่นใช้ ภ.ง.ด.90', () => {
    const i = emptyInput()
    i.income.salary = 500_000
    expect(formType(i)).toBe('PND91')
    i.income.freelance = 10_000
    expect(formType(i)).toBe('PND90')
  })

  it('ขั้นตอนครบ และกรอกยอดจ่ายจริงของค่าลดหย่อน', () => {
    const i = emptyInput()
    i.income.salary = 600_000
    i.credits.withheld = 20_000
    i.deductions.rmf = 400_000 // เกินเพดาน 30%
    i.deductions.parents = 2
    const steps = filingSteps(i, calculateTax(i, R), R)
    expect(steps.map((s) => s.id)).toEqual(['form', 'status', 'income', 'deductions', 'check'])
    const ded = steps.find((s) => s.id === 'deductions')!
    const rmf = ded.fields.find((f) => f.label === 'กองทุน RMF')!
    expect(rmf.amount).toBe(400_000)
    expect(rmf.note).toContain('180,000')
    expect(ded.fields.find((f) => f.label === 'อุปการะบิดามารดา')?.value).toBe('2 คน')
  })

  it('เอกสารตามที่กรอก', () => {
    const i = emptyInput()
    i.income.salary = 600_000
    i.deductions.lifeInsurance = 20_000
    const ids = documentChecklist(i, R).map((d) => d.id)
    expect(ids).toEqual(['pnd50', 'insurance', 'promptpay'])
  })
})
