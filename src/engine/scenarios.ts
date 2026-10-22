import { calculateTax, marginalRate, progressiveTax } from './calculate'
import { emptyInput } from './defaults'
import type { TaxInput, TaxResult, TaxRules } from './types'

const round2 = (n: number) => Math.round(n * 100) / 100

// ---------- ยื่นแยก vs ยื่นรวมกับคู่สมรส ----------

export interface SpouseComparison {
  you: TaxResult
  spouse: TaxResult
  separate: { tax: number; balance: number }
  joint: { tax: number; balance: number; netIncome: number; marginalRate: number }
  better: 'separate' | 'joint'
  difference: number
}

/** สร้างข้อมูลภาษีของคู่สมรส จากช่องที่กรอกไว้ (บุตรใช้รายชื่อเดียวกัน เพราะยื่นแยกต่างฝ่ายต่างหักบุตรได้เต็ม) */
export function spouseAsInput(input: TaxInput): TaxInput {
  const sp = input.spouse
  const s = emptyInput()
  s.profile = { married: true, spouseHasIncome: true, elderlyOrDisabled: false }
  s.income.salary = sp.salary
  s.income.freelance = sp.freelance
  s.credits.withheld = sp.withheld
  s.deductions.children = [...input.deductions.children]
  s.deductions.parents = sp.parents
  s.deductions.socialSecurity = sp.socialSecurity
  s.deductions.lifeInsurance = sp.lifeInsurance
  s.deductions.healthInsurance = sp.healthInsurance
  s.deductions.pvd = sp.pvd
  s.deductions.rmf = sp.rmf
  s.deductions.thaiEsg = sp.thaiEsg
  return s
}

/**
 * เทียบภาษีรวมของครอบครัว
 * - ยื่นแยก: ต่างคนต่างคำนวณ แต่ละฝ่ายหักลดหย่อนบุตรได้เต็ม
 * - ยื่นรวม: รวมเงินได้สุทธิของทั้งคู่ไว้ในแบบเดียว หักค่าใช้จ่ายและค่าลดหย่อนของแต่ละคนตามเพดานรายคน
 *   ค่าลดหย่อนบุตรหักได้ชุดเดียว และค่าลดหย่อนส่วนตัวของคู่สมรสกลายเป็นค่าลดหย่อนคู่สมรส (60,000 เท่ากัน)
 *   (ประมาณการ: เพดานเงินบริจาคยังคิดแยกรายคน)
 */
export function compareSpouseFiling(input: TaxInput, rules: TaxRules): SpouseComparison | null {
  if (!input.profile.married || !input.profile.spouseHasIncome) return null
  if (input.spouse.salary + input.spouse.freelance <= 0) return null

  const youInput: TaxInput = { ...input, profile: { ...input.profile, married: true, spouseHasIncome: true } }
  const you = calculateTax(youInput, rules)
  const spouse = calculateTax(spouseAsInput(input), rules)

  const childrenOnce = spouse.deductions.find((d) => d.id === 'children')?.allowed ?? 0
  const jointDeductions = you.totalDeductions + spouse.totalDeductions - childrenOnce
  const netIncome = Math.max(0, you.incomeAfterExpenses + spouse.incomeAfterExpenses - jointDeductions)
  const prog = progressiveTax(netIncome, rules).tax
  const nonSalary = you.totalIncome - input.income.salary - input.income.foreign.employment + input.spouse.freelance
  let minimum = 0
  if (nonSalary >= rules.minimumTax.incomeThreshold) {
    const m = round2(nonSalary * rules.minimumTax.rate)
    minimum = m > rules.minimumTax.exemptIfNotExceed ? m : 0
  }
  const jointTax = Math.max(prog, minimum)
  const credits = you.credits + spouse.credits

  const separateTax = round2(you.tax + spouse.tax)
  const better = jointTax < separateTax ? 'joint' : 'separate'
  return {
    you,
    spouse,
    separate: { tax: separateTax, balance: round2(you.balance + spouse.balance) },
    joint: { tax: round2(jointTax), balance: round2(jointTax - credits), netIncome, marginalRate: marginalRate(netIncome, rules) },
    better,
    difference: round2(Math.abs(jointTax - separateTax)),
  }
}

// ---------- ภ.ง.ด.94 (ภาษีครึ่งปี ม.ค.–มิ.ย.) ----------

/** กฎสำหรับครึ่งปี: ค่าลดหย่อนและเพดานต่าง ๆ ใช้ได้กึ่งหนึ่ง เกณฑ์วิธี 0.5% ก็ใช้กึ่งหนึ่ง */
export function halfYearRules(rules: TaxRules): TaxRules {
  const half = (n: number) => n / 2
  const d = rules.deductions
  const halfRateMax = (r: { rate: number; max: number }) => ({ rate: r.rate, max: half(r.max) })
  return {
    ...rules,
    measures: [],
    elderlyExemption: half(rules.elderlyExemption),
    minimumTax: {
      rate: rules.minimumTax.rate,
      incomeThreshold: half(rules.minimumTax.incomeThreshold),
      exemptIfNotExceed: half(rules.minimumTax.exemptIfNotExceed),
    },
    expenses: { ...rules.expenses, employment: halfRateMax(rules.expenses.employment), royalty: halfRateMax(rules.expenses.royalty) },
    deductions: {
      ...d,
      personal: half(d.personal),
      spouse: half(d.spouse),
      child: half(d.child),
      childSecondPlusBornFrom2561: half(d.childSecondPlusBornFrom2561),
      parent: half(d.parent),
      disabledCare: half(d.disabledCare),
      prenatal: half(d.prenatal),
      socialSecurity: half(d.socialSecurity),
      lifeInsurance: half(d.lifeInsurance),
      healthInsurance: half(d.healthInsurance),
      lifeHealthCombined: half(d.lifeHealthCombined),
      spouseLifeInsurance: half(d.spouseLifeInsurance),
      parentHealthInsurance: half(d.parentHealthInsurance),
      pensionInsurance: halfRateMax(d.pensionInsurance),
      pvd: halfRateMax(d.pvd),
      gpf: halfRateMax(d.gpf),
      nsf: half(d.nsf),
      rmf: halfRateMax(d.rmf),
      ssf: d.ssf ? halfRateMax(d.ssf) : null,
      retirementCombined: half(d.retirementCombined),
      thaiEsg: d.thaiEsg ? halfRateMax(d.thaiEsg) : null,
      thaiEsgxLtf: half(d.thaiEsgxLtf),
      homeLoanInterest: half(d.homeLoanInterest),
      socialEnterprise: half(d.socialEnterprise),
      politicalDonation: half(d.politicalDonation),
    },
  }
}

/** คำนวณ ภ.ง.ด.94 จากเงินได้ 40(5)–40(8) ช่วง ม.ค.–มิ.ย. (หักค่าใช้จ่ายแบบเหมา) */
export function calculateHalfYear(input: TaxInput, rules: TaxRules): TaxResult {
  const h = input.halfYear
  const i = emptyInput()
  i.profile = { ...input.profile }
  i.income.rent.building = h.rent
  i.income.professional.other = h.professional
  i.income.contract.amount = h.contract
  i.income.business.amount = h.business
  i.deductions.children = [...input.deductions.children]
  i.deductions.parents = input.deductions.parents
  i.deductions.disabledCare = input.deductions.disabledCare
  i.deductions.lifeInsurance = h.lifeInsurance
  i.deductions.healthInsurance = h.healthInsurance
  i.deductions.rmf = h.rmf
  i.deductions.thaiEsg = h.thaiEsg
  i.deductions.homeLoanInterest = h.homeLoanInterest
  return calculateTax(i, halfYearRules(rules))
}

// ---------- ตัวช่วยโหมดรายเดือน ----------

/** เงินสมทบประกันสังคมทั้งปีจากเงินเดือน (5% ของค่าจ้าง ไม่เกินเพดานของปีนั้น) */
export function socialSecurityFromSalary(monthlySalary: number, rules: TaxRules): number {
  const monthlyCap = rules.deductions.socialSecurity / 12
  return Math.min(Math.round(monthlySalary * 0.05) * 12, rules.deductions.socialSecurity, Math.round(monthlyCap) * 12)
}

/** ภาษีที่ควรถูกหักต่อเดือน ถ้าอยากให้สิ้นปีไม่ต้องจ่ายเพิ่ม */
export function suggestedMonthlyWithholding(result: TaxResult, otherCredits: number): number {
  return Math.max(0, Math.round((result.tax - otherCredits) / 12))
}
