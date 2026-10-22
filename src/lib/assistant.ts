import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt, pct } from './format'
import { NO_PHP_MESSAGE, readApiJson } from './server'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantStatus = 'checking' | 'ready' | 'not_configured' | 'php_version' | 'no_php' | 'offline'

export async function checkAssistant(): Promise<AssistantStatus> {
  if (__PREVIEW__) return 'offline'
  try {
    const res = await fetch('./api/chat.php', { cache: 'no-store' })
    const data = await readApiJson<{ enabled?: boolean; reason?: string | null }>(res)
    if (data.reason === 'php_version') return 'php_version'
    return data.enabled ? 'ready' : 'not_configured'
  } catch (e) {
    return (e as Error).message === NO_PHP_MESSAGE ? 'no_php' : 'offline'
  }
}

export async function askAssistant(taxYear: number, messages: ChatMessage[], context: string | null): Promise<string> {
  let res: Response
  try {
    res = await fetch('./api/chat.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxYear, messages, context: context ?? '' }),
    })
  } catch {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่')
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reply?: string; error?: string }
  if (!res.ok || !data.ok || !data.reply) throw new Error(data.error ?? 'AI ตอบไม่ได้ในตอนนี้ ลองใหม่อีกครั้ง')
  return data.reply
}

/** สรุปตัวเลขภาษีของผู้ใช้เป็นข้อความสั้น ๆ ส่งให้ AI (เฉพาะเมื่อผู้ใช้ยินยอม) — ไม่มีชื่อหรือเลขประจำตัว */
export function buildContext(input: TaxInput, result: TaxResult, rules: TaxRules): string {
  const lines = [
    `ปีภาษี ${rules.taxYear}`,
    `สถานะ: ${input.profile.married ? `สมรส คู่สมรส${input.profile.spouseHasIncome ? 'มี' : 'ไม่มี'}เงินได้` : 'โสด'}${input.profile.elderlyOrDisabled ? ' อายุ 65+ หรือผู้พิการ' : ''}`,
    'เงินได้:',
    ...result.incomes.map((l) => `- ${l.label}: ${fmt(l.gross)} หักค่าใช้จ่าย ${fmt(l.expense)}`),
    `ค่าลดหย่อนที่ใช้ได้ รวม ${fmt(result.totalDeductions)}:`,
    ...result.deductions.map((d) => `- ${d.label}: กรอก ${fmt(d.claimed)} ใช้ได้ ${fmt(d.allowed)}${d.note ? ` (${d.note})` : ''}`),
    `เงินได้สุทธิ ${fmt(result.netIncome)}`,
    `ภาษีขั้นบันได ${fmt(result.progressiveTax)}${result.minimumTax !== null ? ` / วิธี 0.5% ${fmt(result.minimumTax)}` : ''} → ภาษีทั้งปี ${fmt(result.tax)}`,
    `ฐานภาษีสูงสุด ${pct(result.marginalRate)} อัตราภาษีจริง ${pct(result.effectiveRate)}`,
    `ภาษีหัก ณ ที่จ่าย/จ่ายแล้ว ${fmt(result.credits)} → ${result.balance < 0 ? `ได้คืน ${fmt(-result.balance)}` : `จ่ายเพิ่ม ${fmt(result.balance)}`}`,
  ]
  const inv = input.income.investment
  if (inv.dividends + inv.fundDividends + inv.interest > 0) {
    lines.push(`เงินปันผลหุ้นไทย ${fmt(inv.dividends)} (บริษัทเสียภาษี ${pct(inv.dividendCorpRate)}) เงินปันผลกองทุน ${fmt(inv.fundDividends)} ดอกเบี้ย ${fmt(inv.interest)} · ${inv.includeDividends ? 'นำเงินปันผลมารวมคำนวณ' : 'ไม่นำเงินปันผลมารวม'}`)
  }
  const fx = input.income.foreign
  if (fx.employment + fx.investment > 0) lines.push(`เงินได้ต่างประเทศที่นำเข้าไทย: ค่าจ้าง ${fmt(fx.employment)} การลงทุน ${fmt(fx.investment)} ภาษีที่เสียต่างประเทศ ${fmt(fx.taxPaid)}${fx.hasTreaty ? ' (มีอนุสัญญาภาษีซ้อน)' : ''}`)
  if (input.profile.married && input.profile.spouseHasIncome && input.spouse.salary + input.spouse.freelance > 0) {
    lines.push(`คู่สมรสมีเงินได้ ${fmt(input.spouse.salary + input.spouse.freelance)} บาท (ใช้เทียบยื่นแยก/ยื่นรวมในแอป)`)
  }
  if (input.deductions.children.length) lines.push(`บุตรเกิดปี: ${input.deductions.children.join(', ')}`)
  return lines.join('\n')
}

export const SUGGESTIONS = [
  'ทำไมฉันได้คืน/ต้องจ่ายเพิ่มเท่านี้',
  'ควรซื้อ RMF หรือ ThaiESG เท่าไหร่ดี',
  'ยื่นภาษีต้องใช้เอกสารอะไรบ้าง',
  'ฉันยังขาดสิทธิลดหย่อนอะไรไปบ้าง',
]
