import { describe, expect, it } from 'vitest'
import rules2568 from '../../rules/2568.json'
import { calculateTax } from './calculate'
import { emptyInput } from './defaults'
import { applyPlan, planBudget } from './optimizer'
import type { TaxRules } from './types'

const R = rules2568 as TaxRules

describe('จัดสรรงบลดหย่อน', () => {
  const base = () => {
    const i = emptyInput()
    i.income.salary = 600_000
    i.deductions.socialSecurity = 9_000
    return i
  }

  it('งบ 50,000 ฐาน 10% ประหยัด 5,000 และเติมตามเป้าหมาย', () => {
    const plan = planBudget(base(), R, 50_000, 'flex')
    expect(plan.items).toEqual([expect.objectContaining({ key: 'thaiEsg', amount: 50_000 })])
    expect(plan.saving).toBe(5_000)
  })

  it('เป้าหมายเกษียณเริ่มจาก RMF และเคารพเพดาน 30% ของเงินได้', () => {
    const plan = planBudget(base(), R, 400_000, 'retire')
    // ไม่ต้องใช้ถึง 400,000: ภาษีเป็น 0 เมื่อเงินได้สุทธิลงถึง 150,000
    expect(plan.taxAfter).toBe(0)
    expect(plan.total).toBe(281_000)
    expect(plan.items[0]).toEqual(expect.objectContaining({ key: 'rmf', amount: 180_000 }))
    expect(plan.saving).toBe(20_600)
  })

  it('จุดคุ้มสุด: ใส่เกินกว่านี้ภาษีไม่ลดลงอีก', () => {
    const plan = planBudget(base(), R, 10_000, 'flex')
    expect(plan.usefulLimit).toBe(281_000)
  })

  it('นำแผนไปใช้แล้วภาษีตรงกับที่คำนวณ', () => {
    const i = base()
    const plan = planBudget(i, R, 120_000, 'protect')
    expect(calculateTax(applyPlan(i, plan), R).tax).toBe(plan.taxAfter)
    expect(plan.items[0].key).toBe('healthInsurance')
    expect(plan.items[0].amount).toBe(25_000)
  })

  it('ไม่เสียภาษีอยู่แล้ว ไม่ต้องลงเลย', () => {
    const i = emptyInput()
    i.income.salary = 200_000
    const plan = planBudget(i, R, 100_000, 'flex')
    expect(plan.total).toBe(0)
    expect(plan.usefulLimit).toBe(0)
  })
})
