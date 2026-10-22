import { calculateTax } from './calculate'
import type { DeductionKey, TaxInput, TaxRules } from './types'

export interface PlanSuggestion {
  key: DeductionKey
  label: string
  /** ยังใส่เพิ่มได้อีกกี่บาท */
  room: number
  /** ภาษีที่ประหยัดได้ถ้าใช้สิทธิเต็ม */
  saving: number
  hint: string
}

const CANDIDATES: { key: DeductionKey; label: string; hint: string }[] = [
  { key: 'rmf', label: 'กองทุน RMF', hint: 'ถือจนอายุ 55 ปี และถือครบ 5 ปี' },
  { key: 'thaiEsg', label: 'กองทุน ThaiESG', hint: 'ต้องถือครองตามระยะเวลาที่กำหนด' },
  { key: 'pensionInsurance', label: 'ประกันชีวิตแบบบำนาญ', hint: 'คุ้มครองระยะยาว ได้เงินคืนหลังเกษียณ' },
  { key: 'lifeInsurance', label: 'ประกันชีวิต', hint: 'กรมธรรม์ 10 ปีขึ้นไป' },
  { key: 'healthInsurance', label: 'ประกันสุขภาพ', hint: 'ได้ทั้งความคุ้มครองและลดหย่อนภาษี' },
  { key: 'nsf', label: 'กอช.', hint: 'สำหรับผู้ที่ไม่อยู่ในระบบบำนาญอื่น' },
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
