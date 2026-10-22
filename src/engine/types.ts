// กฎภาษีของแต่ละปี (โครงสร้างเดียวกับไฟล์ rules/*.json และข้อมูลในตาราง rule_sets)

export interface Bracket {
  upTo: number | null
  rate: number
}

export interface RateMax {
  rate: number
  max: number
}

export interface MeasureInput {
  id: string
  label: string
  multiplier: number
  maxActual?: number
  /** หักได้เป็นขั้น เช่น ทุก 1,000,000 บาท */
  step?: number
}

/** มาตรการพิเศษรายปี (ช้อปลดหย่อน เที่ยวลดหย่อน ฯลฯ) — เพิ่มจากหลังบ้านได้โดยไม่ต้องแก้โค้ด */
export interface Measure {
  id: string
  label: string
  description?: string
  inputs: MeasureInput[]
  maxActual?: number
  maxDeduction: number
}

export interface TaxRules {
  taxYear: number
  revision: number
  updatedAt: string
  notes?: string
  sources: { title: string; url: string }[]
  filingDeadlines: { paper: string; online: string }
  brackets: Bracket[]
  minimumTax: { rate: number; incomeThreshold: number; exemptIfNotExceed: number }
  elderlyExemption: number
  /** ภาษีหัก ณ ที่จ่ายของเงินได้ 40(4) (ไม่มีในกฎเก่า → ใช้ค่าเริ่มต้น) */
  investment?: { dividendWithholdingRate: number; interestWithholdingRate: number }
  expenses: {
    employment: RateMax
    royalty: RateMax
    rent: { building: number; agriLand: number; otherLand: number; vehicle: number; other: number }
    professional: { medical: number; other: number }
    contract: { rate: number }
    business: { rate: number }
  }
  deductions: {
    personal: number
    spouse: number
    child: number
    childSecondPlusBornFrom2561: number
    parent: number
    disabledCare: number
    prenatal: number
    socialSecurity: number
    lifeInsurance: number
    healthInsurance: number
    lifeHealthCombined: number
    spouseLifeInsurance: number
    parentHealthInsurance: number
    pensionInsurance: RateMax
    pvd: RateMax
    gpf: RateMax
    nsf: number
    rmf: RateMax
    ssf: RateMax | null
    retirementCombined: number
    thaiEsg: RateMax | null
    thaiEsgxLtf: number
    homeLoanInterest: number
    socialEnterprise: number
    politicalDonation: number
    donationCapRate: number
  }
  measures: Measure[]
}

// ข้อมูลที่ผู้ใช้กรอก

export interface TaxInput {
  profile: {
    married: boolean
    spouseHasIncome: boolean
    /** อายุ 65 ปีขึ้นไป หรือเป็นผู้พิการ — ได้ยกเว้นเงินได้ 190,000 บาท */
    elderlyOrDisabled: boolean
  }
  income: {
    salary: number
    freelance: number
    royalty: number
    rent: { building: number; agriLand: number; otherLand: number; vehicle: number; other: number }
    professional: { medical: number; other: number }
    contract: { amount: number; useActual: boolean; actualExpense: number }
    business: { amount: number; useActual: boolean; actualExpense: number }
    /** เงินได้ 40(4) */
    investment: {
      /** เงินปันผลจากบริษัทที่เสียภาษีนิติบุคคล (ได้เครดิตภาษี) */
      dividends: number
      /** อัตราภาษีนิติบุคคลของบริษัทที่จ่ายเงินปันผล เช่น 0.2 */
      dividendCorpRate: number
      /** เงินปันผลที่ไม่มีเครดิตภาษี เช่น จากกองทุนรวม หรือกิจการ BOI */
      fundDividends: number
      includeDividends: boolean
      /** ดอกเบี้ยที่ถูกหักภาษี 15% (เช่น เงินฝากประจำ) */
      interest: number
      includeInterest: boolean
    }
    /** เงินได้จากต่างประเทศที่เกิดตั้งแต่ปี 2567 และนำเข้าไทยในปีภาษีนี้ (ป.161/2566) */
    foreign: {
      /** ค่าจ้างจากการทำงานในต่างประเทศ (40(1)) */
      employment: number
      /** เงินปันผล ดอกเบี้ย กำไรจากการขายหุ้นต่างประเทศ (40(4)) */
      investment: number
      /** ภาษีที่เสียไปแล้วในต่างประเทศ */
      taxPaid: number
      /** ประเทศนั้นมีอนุสัญญาภาษีซ้อนกับไทย (นำภาษีที่เสียแล้วมาเครดิตได้) */
      hasTreaty: boolean
    }
    /** กรอกเงินเดือนแบบรายเดือน (ใช้ในหน้าจอ แอปแปลงเป็นยอดทั้งปีให้) */
    monthly: { enabled: boolean; salary: number; bonus: number; withheld: number }
  }
  deductions: {
    /** ปีเกิดของบุตรแต่ละคน (พ.ศ.) เรียงตามลำดับการเกิด */
    children: number[]
    parents: number
    disabledCare: number
    prenatal: number
    socialSecurity: number
    lifeInsurance: number
    healthInsurance: number
    spouseLifeInsurance: number
    parentHealthInsurance: number
    pensionInsurance: number
    pvd: number
    gpf: number
    nsf: number
    rmf: number
    ssf: number
    thaiEsg: number
    thaiEsgxLtf: number
    homeLoanInterest: number
    socialEnterprise: number
    politicalDonation: number
    donationEducation: number
    donationGeneral: number
  }
  /** measureId → inputId → ยอดที่จ่ายจริง */
  measures: Record<string, Record<string, number>>
  /** ข้อมูลคู่สมรสที่มีเงินได้ ใช้เทียบยื่นแยก/ยื่นรวม */
  spouse: {
    salary: number
    freelance: number
    withheld: number
    socialSecurity: number
    lifeInsurance: number
    healthInsurance: number
    pvd: number
    rmf: number
    thaiEsg: number
    parents: number
  }
  /** เงินได้และค่าลดหย่อนช่วง ม.ค.–มิ.ย. สำหรับคำนวณ ภ.ง.ด.94 */
  halfYear: {
    rent: number
    professional: number
    contract: number
    business: number
    lifeInsurance: number
    healthInsurance: number
    rmf: number
    thaiEsg: number
    homeLoanInterest: number
  }
  credits: {
    /** ภาษีหัก ณ ที่จ่ายตาม 50 ทวิ */
    withheld: number
    /** ภาษีที่จ่ายไปแล้วตอนยื่น ภ.ง.ด.94 */
    prepaid: number
  }
}

export type DeductionKey = keyof TaxInput['deductions']

// ผลการคำนวณ

export interface IncomeLine {
  id: string
  label: string
  gross: number
  expense: number
}

export interface DeductionLine {
  id: string
  label: string
  group: 'family' | 'insurance' | 'saving' | 'other' | 'measure' | 'donation'
  claimed: number
  allowed: number
  note?: string
}

export interface BracketLine {
  from: number
  to: number | null
  rate: number
  taxable: number
  tax: number
}

export interface TaxResult {
  incomes: IncomeLine[]
  totalIncome: number
  elderlyExemption: number
  totalExpense: number
  incomeAfterExpenses: number
  deductions: DeductionLine[]
  totalDeductions: number
  netIncome: number
  brackets: BracketLine[]
  progressiveTax: number
  minimumTax: number | null
  usedMinimumTax: boolean
  tax: number
  /** เครดิตภาษีเงินปันผล (เมื่อเลือกนำมารวมคำนวณ) */
  dividendCredit: number
  /** ภาษีที่ถูกหักจากเงินปันผล/ดอกเบี้ยที่นำมารวมคำนวณ */
  investmentWithheld: number
  /** เครดิตภาษีที่เสียในต่างประเทศ (ตามอนุสัญญาภาษีซ้อน) */
  foreignTaxCredit: number
  credits: number
  /** บวก = ต้องจ่ายเพิ่ม, ลบ = ได้คืน */
  balance: number
  effectiveRate: number
  marginalRate: number
  warnings: string[]
}
