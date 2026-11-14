import { emptyInput } from './defaults'
import type { TaxInput, TaxRules } from './types'

export type ExampleId = 'salary' | 'freelance' | 'family' | 'investor'

interface Example {
  label: string
  labelEn: string
  desc: string
  descEn: string
  build: (year: number, rules: TaxRules) => TaxInput
}

/** ข้อมูลตัวอย่างสำหรับลองใช้และเดโม แต่ละแบบโชว์ความสามารถของแอปคนละด้าน */
export const EXAMPLES: Record<ExampleId, Example> = {
  salary: {
    label: 'มนุษย์เงินเดือน',
    labelEn: 'Salaried employee',
    desc: 'เงินเดือน 60,000 บาท/เดือน มีลูก 1 คน ดูแลแม่ 1 คน',
    descEn: 'Salary 60,000 baht/month, 1 child, supports 1 parent',
    build: (year, rules) => {
      const i = emptyInput()
      i.income.salary = 720_000
      i.credits.withheld = 26_000
      i.deductions.socialSecurity = rules.deductions.socialSecurity
      i.deductions.lifeInsurance = 30_000
      i.deductions.rmf = 50_000
      i.deductions.parents = 1
      i.deductions.children = [year - 6]
      return i
    },
  },
  freelance: {
    label: 'ฟรีแลนซ์',
    labelEn: 'Freelancer',
    desc: 'รับงานออกแบบ 60,000 บาท/เดือน ลูกค้าบางรายไม่ได้หักภาษี ณ ที่จ่าย',
    descEn: 'Design work, 60,000 baht/month. Some clients did not withhold tax',
    build: () => {
      const i = emptyInput()
      i.income.freelance = 720_000
      i.credits.withheld = 18_000
      i.deductions.healthInsurance = 12_000
      i.deductions.thaiEsg = 30_000
      return i
    },
  },
  family: {
    label: 'คนมีครอบครัว',
    labelEn: 'Family with a spouse',
    desc: 'เงินเดือน 125,000 บาท/เดือน คู่สมรสไม่มีรายได้ ลูก 2 คน ผ่อนบ้าน',
    descEn: 'Salary 125,000 baht/month, spouse has no income, 2 children, home loan',
    build: (year, rules) => {
      const i = emptyInput()
      i.profile.married = true
      i.income.salary = 1_500_000
      i.credits.withheld = 110_000
      i.deductions.socialSecurity = rules.deductions.socialSecurity
      i.deductions.pvd = 75_000
      i.deductions.children = [year - 8, year - 3]
      i.deductions.parents = 2
      i.deductions.lifeInsurance = 60_000
      i.deductions.healthInsurance = 20_000
      i.deductions.spouseLifeInsurance = 10_000
      i.deductions.homeLoanInterest = 100_000
      return i
    },
  },
  investor: {
    label: 'นักลงทุน',
    labelEn: 'Investor',
    desc: 'เงินเดือน 80,000 บาท/เดือน มีเงินปันผลหุ้นไทย ซื้อ RMF และ ThaiESG',
    descEn: 'Salary 80,000 baht/month, Thai stock dividends, buys RMF and ThaiESG',
    build: (_year, rules) => {
      const i = emptyInput()
      i.income.salary = 960_000
      i.credits.withheld = 48_000
      i.income.investment.dividends = 150_000
      i.income.investment.dividendCorpRate = 0.2
      i.income.investment.interest = 20_000
      i.deductions.socialSecurity = rules.deductions.socialSecurity
      i.deductions.pvd = 48_000
      i.deductions.rmf = 100_000
      i.deductions.thaiEsg = 100_000
      return i
    },
  },
}

export const EXAMPLE_IDS = Object.keys(EXAMPLES) as ExampleId[]
