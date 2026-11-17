import { calculateTax } from './calculate'
import type { DeductionKey, TaxInput, TaxRules } from './types'

export type BudgetGoal = 'flex' | 'retire' | 'protect'

interface Product {
  key: DeductionKey
  label: string
  labelEn: string
  hint: string
  hintEn: string
}

const PRODUCTS: Record<string, Product> = {
  thaiEsg: { key: 'thaiEsg', label: 'กองทุน ThaiESG', labelEn: 'ThaiESG fund', hint: 'ถือครองตามระยะที่กำหนด ไม่ต้องรอเกษียณ', hintEn: 'Hold for the set period; no need to wait for retirement' },
  rmf: { key: 'rmf', label: 'กองทุน RMF', labelEn: 'RMF fund', hint: 'ถือจนอายุ 55 ปี และอย่างน้อย 5 ปี', hintEn: 'Hold until age 55 and for at least 5 years' },
  pensionInsurance: { key: 'pensionInsurance', label: 'ประกันบำนาญ', labelEn: 'Pension insurance', hint: 'จ่ายเบี้ยตามสัญญา ได้เงินคืนหลังเกษียณ', hintEn: 'Pay premiums as agreed; money comes back after retirement' },
  nsf: { key: 'nsf', label: 'กอช.', labelEn: 'National Savings Fund (NSF)', hint: 'สำหรับผู้ไม่มีบำนาญอื่น รัฐสมทบเพิ่มให้', hintEn: 'For people without another pension; the government adds to it' },
  lifeInsurance: { key: 'lifeInsurance', label: 'ประกันชีวิต', labelEn: 'Life insurance', hint: 'กรมธรรม์ 10 ปีขึ้นไป', hintEn: 'Policies of 10 years or more' },
  healthInsurance: { key: 'healthInsurance', label: 'ประกันสุขภาพ', labelEn: 'Health insurance', hint: 'ได้ความคุ้มครองค่ารักษาด้วย', hintEn: 'Also covers medical costs' },
}

/** ลำดับที่เติมเงินตามเป้าหมาย ทุกรายการลดภาษีบาทต่อบาทเท่ากัน ต่างกันที่เงื่อนไขและประโยชน์อื่น */
export const GOALS: Record<BudgetGoal, { label: string; labelEn: string; hint: string; hintEn: string; order: DeductionKey[] }> = {
  flex: {
    label: 'ยืดหยุ่น',
    labelEn: 'Flexible',
    hint: 'ถอนได้เร็วที่สุด',
    hintEn: 'Quickest to withdraw',
    order: ['thaiEsg', 'rmf', 'healthInsurance', 'lifeInsurance', 'pensionInsurance', 'nsf'],
  },
  retire: {
    label: 'ออมเกษียณ',
    labelEn: 'Retirement',
    hint: 'เน้นเงินก้อนหลังเกษียณ',
    hintEn: 'Focus on a lump sum after retirement',
    order: ['rmf', 'pensionInsurance', 'nsf', 'thaiEsg', 'lifeInsurance', 'healthInsurance'],
  },
  protect: {
    label: 'ความคุ้มครอง',
    labelEn: 'Protection',
    hint: 'เน้นประกันก่อน',
    hintEn: 'Insurance first',
    order: ['healthInsurance', 'lifeInsurance', 'pensionInsurance', 'rmf', 'thaiEsg', 'nsf'],
  },
}

export interface Allocation {
  key: DeductionKey
  label: string
  labelEn: string
  hint: string
  hintEn: string
  amount: number
}

export interface BudgetPlan {
  items: Allocation[]
  /** เงินที่ควรลงจริง (อาจน้อยกว่างบ ถ้าใส่เกินแล้วภาษีไม่ลดลงอีก) */
  total: number
  saving: number
  taxBefore: number
  taxAfter: number
  /** ใส่เกินจำนวนนี้ภาษีไม่ลดลงอีก (ภาษีเป็น 0 หรือติดวิธี 0.5%) */
  usefulLimit: number
}

const BIG = 100_000_000

const withExtra = (input: TaxInput, extra: Partial<Record<DeductionKey, number>>): TaxInput => {
  const d = { ...input.deductions } as Record<string, unknown>
  for (const [k, v] of Object.entries(extra)) d[k] = (d[k] as number) + (v ?? 0)
  return { ...input, deductions: d as TaxInput['deductions'] }
}

/** เติมงบตามลำดับ โดยเคารพเพดานทุกตัว (รวมเพดานกลุ่มเกษียณ 500,000 และประกันชีวิต+สุขภาพ) */
function fill(input: TaxInput, rules: TaxRules, budget: number, order: DeductionKey[]): Partial<Record<DeductionKey, number>> {
  const extra: Partial<Record<DeductionKey, number>> = {}
  let remaining = budget
  for (const key of order) {
    if (remaining <= 0) break
    if (key === 'thaiEsg' && !rules.deductions.thaiEsg) continue
    const allowedNow = calculateTax(withExtra(input, extra), rules).deductions.find((l) => l.id === key)?.allowed ?? 0
    const allowedMax = calculateTax(withExtra(input, { ...extra, [key]: BIG }), rules).deductions.find((l) => l.id === key)?.allowed ?? 0
    const room = Math.max(0, Math.floor(allowedMax - allowedNow))
    const amt = Math.min(room, remaining)
    if (amt > 0) {
      extra[key] = amt
      remaining -= amt
    }
  }
  return extra
}

/** ตัดยอดส่วนเกินท้ายแผนออก: ใส่เกินจุดที่ภาษีเป็น 0 (หรือติดวิธี 0.5%) ก็ไม่ได้ลดภาษีเพิ่ม */
function trim(input: TaxInput, rules: TaxRules, extra: Partial<Record<DeductionKey, number>>, order: DeductionKey[]) {
  const taxWith = (e: Partial<Record<DeductionKey, number>>) => calculateTax(withExtra(input, e), rules).tax
  const target = taxWith(extra) + 0.005
  for (const key of [...order].reverse()) {
    const amt = extra[key] ?? 0
    if (amt <= 0) continue
    if (taxWith({ ...extra, [key]: 0 }) <= target) {
      extra[key] = 0 // รายการนี้ไม่จำเป็นเลย ลองตัดรายการก่อนหน้าต่อ
      continue
    }
    // หายอดน้อยที่สุดที่ยังได้ภาษีเท่าเดิม
    let lo = 0
    let hi = amt
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)
      if (taxWith({ ...extra, [key]: mid }) <= target) hi = mid
      else lo = mid
    }
    extra[key] = Math.min(amt, Math.ceil(hi / 100) * 100)
    break
  }
  return extra
}

export function planBudget(input: TaxInput, rules: TaxRules, budget: number, goal: BudgetGoal): BudgetPlan {
  const order = GOALS[goal].order
  const taxBefore = calculateTax(input, rules).tax
  const extra = trim(input, rules, fill(input, rules, Math.max(0, budget), order), order)
  const taxAfter = calculateTax(withExtra(input, extra), rules).tax
  const full = trim(input, rules, fill(input, rules, BIG, order), order)
  const items = order
    .filter((k) => (extra[k] ?? 0) > 0)
    .map((k) => ({ ...PRODUCTS[k], amount: extra[k]! }))
  return {
    items,
    total: items.reduce((s, i) => s + i.amount, 0),
    saving: Math.round((taxBefore - taxAfter) * 100) / 100,
    taxBefore,
    taxAfter,
    usefulLimit: Object.values(full).reduce((s, v) => s + (v ?? 0), 0),
  }
}

/** นำแผนไปใส่ในค่าลดหย่อนจริง (บวกเพิ่มจากที่กรอกไว้) */
export function applyPlan(input: TaxInput, plan: BudgetPlan): TaxInput {
  return withExtra(input, Object.fromEntries(plan.items.map((i) => [i.key, i.amount])))
}
