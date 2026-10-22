import { describe, expect, it } from 'vitest'
import rules2568 from '../../rules/2568.json'
import rules2569 from '../../rules/2569.json'
import { calculateTax } from './calculate'
import { emptyInput } from './defaults'
import { calculateHalfYear, compareSpouseFiling, socialSecurityFromSalary } from './scenarios'
import type { TaxRules } from './types'

const R68 = rules2568 as TaxRules
const R69 = rules2569 as TaxRules

describe('ยื่นแยก vs ยื่นรวมกับคู่สมรส', () => {
  it('รายได้ใกล้กัน ยื่นแยกเสียน้อยกว่า และแต่ละฝ่ายหักบุตรได้เต็ม', () => {
    const i = emptyInput()
    i.profile.married = true
    i.profile.spouseHasIncome = true
    i.income.salary = 600_000
    i.deductions.socialSecurity = 9_000
    i.deductions.children = [2563]
    i.spouse.salary = 600_000
    i.spouse.socialSecurity = 9_000
    const c = compareSpouseFiling(i, R68)!
    expect(c.you.tax).toBe(17_600)
    expect(c.spouse.tax).toBe(17_600)
    expect(c.separate.tax).toBe(35_200)
    expect(c.joint.netIncome).toBe(832_000)
    expect(c.joint.tax).toBe(81_400)
    expect(c.better).toBe('separate')
  })

  it('คู่สมรสรายได้น้อยมาก ยื่นรวมอาจคุ้มกว่า', () => {
    const i = emptyInput()
    i.profile.married = true
    i.profile.spouseHasIncome = true
    i.income.salary = 1_000_000
    i.spouse.salary = 100_000
    const c = compareSpouseFiling(i, R68)!
    expect(c.separate.tax).toBe(83_000)
    expect(c.joint.tax).toBe(81_000)
    expect(c.better).toBe('joint')
  })

  it('ไม่มีข้อมูลคู่สมรส ไม่เทียบ', () => {
    const i = emptyInput()
    i.profile.married = true
    i.profile.spouseHasIncome = true
    expect(compareSpouseFiling(i, R68)).toBeNull()
  })
})

describe('ภ.ง.ด.94 ครึ่งปี', () => {
  it('ค่าลดหย่อนกึ่งหนึ่ง และวิธี 0.5% ใช้เกณฑ์กึ่งหนึ่ง', () => {
    const i = emptyInput()
    i.halfYear.business = 400_000
    const r = calculateHalfYear(i, R68)
    expect(r.totalExpense).toBe(240_000)
    expect(r.totalDeductions).toBe(30_000)
    expect(r.minimumTax).toBe(0) // 2,000 ไม่เกิน 2,500
    expect(r.tax).toBe(0)
  })

  it('รายได้ครึ่งปีสูง คิดภาษีขั้นบันได', () => {
    const i = emptyInput()
    i.halfYear.business = 1_000_000
    const r = calculateHalfYear(i, R68)
    expect(r.netIncome).toBe(370_000)
    expect(r.tax).toBe(14_500)
  })
})

describe('ตัวช่วยรายเดือน', () => {
  it('ประกันสังคมจากเงินเดือน ตามเพดานของปี', () => {
    expect(socialSecurityFromSalary(30_000, R69)).toBe(10_500)
    expect(socialSecurityFromSalary(30_000, R68)).toBe(9_000)
    expect(socialSecurityFromSalary(10_000, R69)).toBe(6_000)
  })
})

describe('เงินได้จากต่างประเทศ', () => {
  it('นำเข้าไทยต้องเสียภาษี และเครดิตภาษีต่างประเทศได้ไม่เกินภาษีไทย', () => {
    const i = emptyInput()
    i.income.foreign = { employment: 0, investment: 500_000, taxPaid: 50_000, hasTreaty: true }
    const r = calculateTax(i, R68)
    expect(r.netIncome).toBe(440_000)
    expect(r.tax).toBe(21_500)
    expect(r.foreignTaxCredit).toBe(21_500)
    expect(r.balance).toBe(0)
  })

  it('ไม่มีอนุสัญญาภาษีซ้อน เครดิตไม่ได้', () => {
    const i = emptyInput()
    i.income.foreign = { employment: 0, investment: 500_000, taxPaid: 50_000, hasTreaty: false }
    expect(calculateTax(i, R68).balance).toBe(21_500)
  })

  it('ค่าจ้างต่างประเทศใช้เพดานค่าใช้จ่ายร่วมกับเงินเดือนในไทย', () => {
    const i = emptyInput()
    i.income.salary = 150_000
    i.income.foreign.employment = 200_000
    const r = calculateTax(i, R68)
    expect(r.totalExpense).toBe(100_000)
    expect(r.minimumTax).toBeNull()
  })
})
