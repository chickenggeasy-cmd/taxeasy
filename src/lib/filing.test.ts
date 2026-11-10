import { describe, expect, it } from 'vitest'
import rules2568 from '../../rules/2568.json'
import { calculateTax } from '../engine/calculate'
import { emptyInput } from '../engine/defaults'
import type { TaxRules } from '../engine/types'
import { DEFAULT_FILING_THRESHOLDS, documentChecklist, filingRequirement, filingSteps, formType } from './filing'

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

  describe('ต้องยื่นแบบหรือไม่', () => {
    const req = (edit: (i: ReturnType<typeof emptyInput>) => void, rules: TaxRules = R) => {
      const i = emptyInput()
      edit(i)
      return filingRequirement(i, calculateTax(i, rules), rules)
    }

    it('ยังไม่มีเงินได้ ไม่แสดงอะไร', () => {
      expect(req(() => {})).toBeNull()
    })

    it('โสด เงินเดือนอย่างเดียว: เกิน 120,000 ต้องยื่น แม้ภาษีเป็น 0', () => {
      expect(req((i) => void (i.income.salary = 120_000))?.status).toBe('none')
      const r = req((i) => void (i.income.salary = 180_000))
      expect(r).toMatchObject({ status: 'required', form: 'PND91', threshold: 120_000, title: 'ต้องยื่นแบบ ภ.ง.ด.91' })
      expect(r?.reason).toContain('แม้ไม่ต้องเสียภาษี')
    })

    it('โสด มีเงินได้ประเภทอื่น: เกิน 60,000 ต้องยื่น ภ.ง.ด.90', () => {
      expect(req((i) => void (i.income.freelance = 60_000))?.status).toBe('none')
      expect(req((i) => void (i.income.freelance = 60_001))).toMatchObject({ status: 'required', form: 'PND90', threshold: 60_000 })
      // มีเงินเดือนด้วย ก็ใช้เกณฑ์ 60,000 ของเงินได้รวม
      expect(req((i) => ((i.income.salary = 50_000), (i.income.freelance = 20_000)))).toMatchObject({ status: 'required', income: 70_000 })
    })

    it('มีคู่สมรส: เกณฑ์ 220,000 / 120,000 และนับเงินได้ของคู่สมรสรวมด้วย', () => {
      expect(req((i) => ((i.profile.married = true), (i.income.salary = 220_000)))?.status).toBe('none')
      expect(req((i) => ((i.profile.married = true), (i.income.salary = 220_001)))).toMatchObject({ status: 'required', threshold: 220_000 })
      expect(req((i) => ((i.profile.married = true), (i.income.business.amount = 120_001)))).toMatchObject({ status: 'required', threshold: 120_000 })
      const both = req((i) => {
        i.profile.married = true
        i.profile.spouseHasIncome = true
        i.income.salary = 150_000
        i.spouse.salary = 100_000
      })
      expect(both).toMatchObject({ status: 'required', income: 250_000, threshold: 220_000 })
      expect(both?.reason).toContain('คู่สมรสรวม')
      // คู่สมรสมีเงินได้ 40(2) → ใช้เกณฑ์ 120,000
      const mixed = req((i) => {
        i.profile.married = true
        i.profile.spouseHasIncome = true
        i.income.salary = 100_000
        i.spouse.freelance = 30_000
      })
      expect(mixed).toMatchObject({ status: 'required', income: 130_000, threshold: 120_000 })
    })

    it('ไม่ถึงเกณฑ์แต่ถูกหักภาษีไว้: ควรยื่นเพื่อขอเงินคืน', () => {
      const r = req((i) => ((i.income.salary = 100_000), (i.credits.withheld = 500)))
      expect(r).toMatchObject({ status: 'refund', title: 'ควรยื่นแบบ ภ.ง.ด.91 เพื่อขอเงินคืน' })
      expect(r?.reason).toContain('500')
    })

    it('เงินปันผลที่ไม่นำมารวมคำนวณ ไม่นับเป็นเงินได้ที่ต้องยื่น', () => {
      expect(req((i) => ((i.income.salary = 100_000), (i.income.investment.dividends = 500_000)))?.status).toBe('none')
    })

    it('ใช้เกณฑ์จากกฎภาษีถ้ามี ไม่มีก็ใช้ค่าเริ่มต้น', () => {
      expect(R.filingThresholds).toEqual(DEFAULT_FILING_THRESHOLDS)
      const old = { ...R, filingThresholds: undefined }
      expect(req((i) => void (i.income.salary = 180_000), old)?.threshold).toBe(120_000)
      const raised = { ...R, filingThresholds: { ...DEFAULT_FILING_THRESHOLDS, single: { salaryOnly: 200_000, other: 60_000 } } }
      expect(req((i) => void (i.income.salary = 180_000), raised)?.status).toBe('none')
    })
  })
})
