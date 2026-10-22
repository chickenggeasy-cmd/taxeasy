import { describe, expect, it } from 'vitest'
import rules2568 from '../../rules/2568.json'
import rules2569 from '../../rules/2569.json'
import { calculateTax, measureDeduction } from './calculate'
import { emptyInput } from './defaults'
import { planSuggestions } from './plan'
import type { TaxInput, TaxRules } from './types'

const R68 = rules2568 as TaxRules
const R69 = rules2569 as TaxRules

function make(fn: (i: TaxInput) => void): TaxInput {
  const i = emptyInput()
  fn(i)
  return i
}
const allowed = (res: ReturnType<typeof calculateTax>, id: string) => res.deductions.find((l) => l.id === id)?.allowed ?? 0

describe('ภาษีขั้นบันได', () => {
  it('มนุษย์เงินเดือน 600,000 บาท + ประกันสังคม', () => {
    const res = calculateTax(
      make((i) => {
        i.income.salary = 600_000
        i.deductions.socialSecurity = 9_000
        i.credits.withheld = 20_000
      }),
      R68,
    )
    expect(res.totalExpense).toBe(100_000)
    expect(res.totalDeductions).toBe(69_000)
    expect(res.netIncome).toBe(431_000)
    expect(res.tax).toBe(20_600)
    expect(res.balance).toBe(600)
    expect(res.marginalRate).toBe(0.1)
  })

  it('เงินได้สุทธิไม่เกิน 150,000 ไม่เสียภาษี', () => {
    const res = calculateTax(make((i) => (i.income.salary = 300_000)), R68)
    expect(res.netIncome).toBe(140_000)
    expect(res.tax).toBe(0)
  })

  it('ฐานสูงสุด 35%', () => {
    const res = calculateTax(make((i) => (i.income.salary = 6_160_000)), R68)
    // 6,160,000 - 100,000 - 60,000 = 6,000,000
    expect(res.netIncome).toBe(6_000_000)
    expect(res.tax).toBe(7_500 + 20_000 + 37_500 + 50_000 + 250_000 + 900_000 + 350_000)
  })
})

describe('วิธี 0.5% ของเงินได้', () => {
  it('ฟรีแลนซ์ 40(8) 500,000 — ภาษี 0.5% ไม่เกิน 5,000 จึงได้รับยกเว้น', () => {
    const res = calculateTax(make((i) => (i.income.business.amount = 500_000)), R68)
    expect(res.totalExpense).toBe(300_000)
    expect(res.minimumTax).toBe(0)
    expect(res.tax).toBe(0)
  })

  it('ใช้วิธี 0.5% เมื่อสูงกว่าวิธีขั้นบันได', () => {
    const res = calculateTax(
      make((i) => {
        i.income.freelance = 1_200_000
        i.deductions.lifeInsurance = 100_000
        i.deductions.rmf = 360_000
        i.deductions.pensionInsurance = 180_000
        i.deductions.thaiEsg = 300_000
      }),
      R68,
    )
    expect(allowed(res, 'rmf')).toBe(320_000) // ชนเพดานกลุ่มเกษียณ 500,000
    expect(res.progressiveTax).toBe(0)
    expect(res.minimumTax).toBe(6_000)
    expect(res.usedMinimumTax).toBe(true)
    expect(res.tax).toBe(6_000)
  })

  it('ไม่ใช้วิธี 0.5% กับเงินเดือนล้วน', () => {
    const res = calculateTax(make((i) => (i.income.salary = 5_000_000)), R68)
    expect(res.minimumTax).toBeNull()
  })

  it('40(8) หักค่าใช้จ่ายตามจริง', () => {
    const res = calculateTax(
      make((i) => {
        i.income.business = { amount: 1_000_000, useActual: true, actualExpense: 700_000 }
      }),
      R68,
    )
    expect(res.totalExpense).toBe(700_000)
  })
})

describe('ค่าลดหย่อน', () => {
  it('บุตรคนที่ 2 ขึ้นไปที่เกิดตั้งแต่ปี 2561', () => {
    const res = calculateTax(make((i) => ((i.income.salary = 1_000_000), (i.deductions.children = [2560, 2562, 2563]))), R68)
    expect(allowed(res, 'children')).toBe(150_000)
  })

  it('บุตรคนแรกเกิดหลังปี 2561 ได้ 30,000', () => {
    const res = calculateTax(make((i) => ((i.income.salary = 1_000_000), (i.deductions.children = [2563]))), R68)
    expect(allowed(res, 'children')).toBe(30_000)
  })

  it('คู่สมรสไม่มีเงินได้ และพ่อแม่', () => {
    const res = calculateTax(
      make((i) => {
        i.income.salary = 1_000_000
        i.profile.married = true
        i.deductions.parents = 2
      }),
      R68,
    )
    expect(allowed(res, 'spouse')).toBe(60_000)
    expect(allowed(res, 'parents')).toBe(60_000)
  })

  it('ประกันชีวิต + สุขภาพ รวมไม่เกิน 100,000', () => {
    const res = calculateTax(
      make((i) => {
        i.income.salary = 1_000_000
        i.deductions.lifeInsurance = 90_000
        i.deductions.healthInsurance = 25_000
      }),
      R68,
    )
    expect(allowed(res, 'lifeInsurance')).toBe(90_000)
    expect(allowed(res, 'healthInsurance')).toBe(10_000)
  })

  it('ประกันบำนาญส่วนที่เกิน 15% ย้ายไปใช้สิทธิประกันชีวิต', () => {
    const res = calculateTax(make((i) => ((i.income.salary = 1_000_000), (i.deductions.pensionInsurance = 200_000))), R68)
    expect(allowed(res, 'pensionInsurance')).toBe(200_000)
  })

  it('ประกันสังคมปี 2569 เพดาน 10,500', () => {
    const input = make((i) => ((i.income.salary = 600_000), (i.deductions.socialSecurity = 10_500)))
    expect(allowed(calculateTax(input, R68), 'socialSecurity')).toBe(9_000)
    expect(allowed(calculateTax(input, R69), 'socialSecurity')).toBe(10_500)
  })

  it('SSF ใช้ไม่ได้ในปี 2568 และมีคำเตือน', () => {
    const res = calculateTax(make((i) => ((i.income.salary = 1_000_000), (i.deductions.ssf = 50_000))), R68)
    expect(allowed(res, 'ssf')).toBe(0)
    expect(res.warnings.length).toBe(1)
  })

  it('ผู้สูงอายุ 65 ปีขึ้นไป ยกเว้น 190,000', () => {
    const res = calculateTax(make((i) => ((i.income.salary = 500_000), (i.profile.elderlyOrDisabled = true))), R68)
    expect(res.elderlyExemption).toBe(190_000)
    expect(res.netIncome).toBe(500_000 - 100_000 - 190_000 - 60_000)
  })
})

describe('เงินบริจาค', () => {
  it('บริจาค 2 เท่า และเพดาน 10%', () => {
    const res = calculateTax(
      make((i) => {
        i.income.salary = 1_000_000
        i.deductions.donationEducation = 50_000
        i.deductions.donationGeneral = 10_000
      }),
      R68,
    )
    expect(allowed(res, 'donationEducation')).toBe(84_000)
    expect(allowed(res, 'donationGeneral')).toBe(10_000)
    expect(res.netIncome).toBe(746_000)
  })
})

describe('มาตรการพิเศษ', () => {
  const m = (id: string) => R68.measures.find((x) => x.id === id)!
  it('เที่ยวดีมีคืน: เมืองรองคิด 1.5 เท่าก่อน ยอดจ่ายรวมไม่เกิน 20,000', () => {
    expect(measureDeduction(m('tour-2568'), { secondary: 15_000, main: 10_000 })).toBe(27_500)
    expect(measureDeduction(m('tour-2568'), { secondary: 50_000 })).toBe(30_000)
  })
  it('Easy E-Receipt 2.0 แยกเพดานทั่วไป/OTOP', () => {
    expect(measureDeduction(m('easy-e-receipt-2'), { general: 40_000, otop: 5_000 })).toBe(35_000)
  })
  it('สร้างบ้าน 10,000 ต่อทุก 1 ล้าน', () => {
    expect(measureDeduction(m('home-build'), { cost: 2_500_000 })).toBe(20_000)
    expect(measureDeduction(m('home-build'), { cost: 15_000_000 })).toBe(100_000)
  })
  it('ปี 2569 ยังไม่มีมาตรการพิเศษ', () => {
    expect(R69.measures).toHaveLength(0)
  })
})

describe('วางแผนภาษี', () => {
  it('แนะนำ RMF พร้อมยอดที่ประหยัดได้', () => {
    const input = make((i) => ((i.income.salary = 600_000), (i.deductions.socialSecurity = 9_000)))
    const plan = planSuggestions(input, R68)
    const rmf = plan.find((p) => p.key === 'rmf')!
    expect(rmf.room).toBe(180_000)
    expect(rmf.saving).toBe(20_600 - 5_050)
  })
})
