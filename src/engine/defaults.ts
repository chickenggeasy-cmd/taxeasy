import type { TaxInput } from './types'

export function emptyInput(): TaxInput {
  return {
    profile: { married: false, spouseHasIncome: false, elderlyOrDisabled: false },
    income: {
      salary: 0,
      freelance: 0,
      royalty: 0,
      rent: { building: 0, agriLand: 0, otherLand: 0, vehicle: 0, other: 0 },
      professional: { medical: 0, other: 0 },
      contract: { amount: 0, useActual: false, actualExpense: 0 },
      business: { amount: 0, useActual: false, actualExpense: 0 },
      investment: { dividends: 0, dividendCorpRate: 0.2, fundDividends: 0, includeDividends: false, interest: 0, includeInterest: false },
    },
    deductions: {
      children: [],
      parents: 0,
      disabledCare: 0,
      prenatal: 0,
      socialSecurity: 0,
      lifeInsurance: 0,
      healthInsurance: 0,
      spouseLifeInsurance: 0,
      parentHealthInsurance: 0,
      pensionInsurance: 0,
      pvd: 0,
      gpf: 0,
      nsf: 0,
      rmf: 0,
      ssf: 0,
      thaiEsg: 0,
      thaiEsgxLtf: 0,
      homeLoanInterest: 0,
      socialEnterprise: 0,
      politicalDonation: 0,
      donationEducation: 0,
      donationGeneral: 0,
    },
    measures: {},
    credits: { withheld: 0, prepaid: 0 },
  }
}

/** รวมข้อมูลที่บันทึกไว้กับค่าเริ่มต้น เผื่อเวอร์ชันใหม่มีช่องเพิ่ม */
export function mergeInput(saved: Partial<TaxInput> | null | undefined): TaxInput {
  const base = emptyInput()
  if (!saved) return base
  return {
    profile: { ...base.profile, ...saved.profile },
    income: {
      ...base.income,
      ...saved.income,
      rent: { ...base.income.rent, ...saved.income?.rent },
      professional: { ...base.income.professional, ...saved.income?.professional },
      contract: { ...base.income.contract, ...saved.income?.contract },
      business: { ...base.income.business, ...saved.income?.business },
      investment: { ...base.income.investment, ...saved.income?.investment },
    },
    deductions: { ...base.deductions, ...saved.deductions },
    measures: { ...saved.measures },
    credits: { ...base.credits, ...saved.credits },
  }
}
