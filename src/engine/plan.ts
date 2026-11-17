import { calculateTax } from './calculate'
import type { DeductionKey, TaxInput, TaxRules } from './types'

/** เทียบผล: นำเงินปันผลมารวมคำนวณ vs ให้ภาษีที่ถูกหักเป็นที่สุด */
export function compareDividendChoice(input: TaxInput, rules: TaxRules): { include: number; exclude: number; better: 'include' | 'exclude' } | null {
  const inv = input.income.investment
  if (inv.dividends + inv.fundDividends <= 0) return null
  const withChoice = (v: boolean) => calculateTax({ ...input, income: { ...input.income, investment: { ...inv, includeDividends: v } } }, rules).balance
  const include = withChoice(true)
  const exclude = withChoice(false)
  return { include, exclude, better: include < exclude ? 'include' : 'exclude' }
}

export interface PlanSuggestion {
  key: DeductionKey
  label: string
  labelEn: string
  /** ยังใส่เพิ่มได้อีกกี่บาท */
  room: number
  /** ภาษีที่ประหยัดได้ถ้าใช้สิทธิเต็ม */
  saving: number
  hint: string
  hintEn: string
}

const CANDIDATES: { key: DeductionKey; label: string; labelEn: string; hint: string; hintEn: string }[] = [
  { key: 'rmf', label: 'กองทุน RMF', labelEn: 'RMF fund', hint: 'ถือจนอายุ 55 ปี และถือครบ 5 ปี', hintEn: 'Hold until age 55 and for a full 5 years' },
  { key: 'thaiEsg', label: 'กองทุน ThaiESG', labelEn: 'ThaiESG fund', hint: 'ต้องถือครองตามระยะเวลาที่กำหนด', hintEn: 'Must be held for the set period' },
  { key: 'pensionInsurance', label: 'ประกันชีวิตแบบบำนาญ', labelEn: 'Pension life insurance', hint: 'คุ้มครองระยะยาว ได้เงินคืนหลังเกษียณ', hintEn: 'Long-term cover; money back after retirement' },
  { key: 'lifeInsurance', label: 'ประกันชีวิต', labelEn: 'Life insurance', hint: 'กรมธรรม์ 10 ปีขึ้นไป', hintEn: 'Policies of 10 years or more' },
  { key: 'healthInsurance', label: 'ประกันสุขภาพ', labelEn: 'Health insurance', hint: 'ได้ทั้งความคุ้มครองและลดหย่อนภาษี', hintEn: 'Gives both cover and a tax deduction' },
  { key: 'nsf', label: 'กอช.', labelEn: 'National Savings Fund (NSF)', hint: 'สำหรับผู้ที่ไม่อยู่ในระบบบำนาญอื่น', hintEn: 'For people not in another pension scheme' },
]

const BIG = 100_000_000

function withDeduction(input: TaxInput, key: DeductionKey, value: number): TaxInput {
  return { ...input, deductions: { ...input.deductions, [key]: value } }
}

/** หาว่าแต่ละรายการยังใส่เพิ่มได้อีกเท่าไร และจะประหยัดภาษีได้กี่บาท (คิดทีละรายการ) */
export function planSuggestions(input: TaxInput, rules: TaxRules): PlanSuggestion[] {
  const base = calculateTax(input, rules)
  const allowedOf = (inp: TaxInput, key: DeductionKey) =>
    calculateTax(inp, rules).deductions.find((l) => l.id === key)?.allowed ?? 0

  const out: PlanSuggestion[] = []
  for (const c of CANDIDATES) {
    if (c.key === 'thaiEsg' && !rules.deductions.thaiEsg) continue
    const current = input.deductions[c.key] as number
    const currentAllowed = allowedOf(input, c.key)
    const maxAllowed = allowedOf(withDeduction(input, c.key, BIG), c.key)
    const room = Math.max(0, Math.floor(maxAllowed - currentAllowed))
    if (room <= 0) continue
    const filled = calculateTax(withDeduction(input, c.key, current + room), rules)
    const saving = Math.round((base.tax - filled.tax) * 100) / 100
    if (saving <= 0) continue
    out.push({ ...c, room, saving })
  }
  return out.sort((a, b) => b.saving - a.saving)
}
