import { planSuggestions } from '../engine/plan'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { IconTile } from '../components/icons'
import { BudgetPlanner } from '../components/BudgetPlanner'
import { SpouseCompare } from '../components/SpouseCompare'
import { WhatIf } from '../components/WhatIf'
import { PageHero } from '../components/ui'
import { fmt, pct } from '../lib/format'
import { useT } from '../lib/lang'

export function Plan({ input, rules, result, update, onAdd, onMarket }: { input: TaxInput; rules: TaxRules; result: TaxResult; update: (fn: (draft: TaxInput) => void) => void; onAdd: () => void; onMarket: () => void }) {
  const t = useT()
  const items = planSuggestions(input, rules)
  const zeroTax = result.tax === 0
  const maxSaving = Math.max(1, ...items.map((i) => i.saving))

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <PageHero
        art="plan"
        title={t('วางแผนภาษี', 'Tax planning')}
        subtitle={t('ดูว่ายังลดหย่อนเพิ่มได้อีกเท่าไร และจะประหยัดได้กี่บาท', 'See how much more you can deduct and how much tax it saves')}
      />
      <section className="rounded-3xl bg-accent-soft p-5">
        <p className="text-sm font-semibold text-accent">{t('ฐานภาษีสูงสุดของคุณ', 'Your top tax bracket')}</p>
        <p className="num font-display text-4xl font-semibold text-accent">{pct(result.marginalRate)}</p>
        <p className="mt-1 text-[15px]">
          {result.marginalRate > 0
            ? t(
                `ทุก ๆ 10,000 บาทที่ลดหย่อนเพิ่ม จะเสียภาษีน้อยลงประมาณ ${fmt(10_000 * result.marginalRate)} บาท`,
                `Every extra 10,000 baht of deductions cuts your tax by about ${fmt(10_000 * result.marginalRate)} baht`,
              )
            : t(
                'ตอนนี้คุณยังไม่เสียภาษีตามขั้นบันได การซื้อกองทุนหรือประกันเพื่อลดหย่อนจะไม่ช่วยลดภาษีเพิ่ม',
                'You pay no bracket tax right now, so buying funds or insurance for deductions will not lower your tax further',
              )}
        </p>
        {result.usedMinimumTax && (
          <p className="mt-2 text-sm text-due">
            {t('ภาษีของคุณคิดจากวิธี 0.5% ของเงินได้ ค่าลดหย่อนเพิ่มจะไม่ช่วยลดภาษีส่วนนี้', 'Your tax uses the 0.5%-of-income method, so extra deductions will not reduce it')}
          </p>
        )}
      </section>

      <BudgetPlanner input={input} rules={rules} update={update} />

      {!zeroTax && items.length > 0 && (
        <section className="card rounded-3xl p-4">
          <div className="mb-3 flex items-center gap-3">
            <IconTile name="bulb" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{t('ยังใช้สิทธิได้อีก', 'Allowances you can still use')}</h2>
              <p className="text-sm text-muted">
                {t('คิดทีละรายการ ถ้าใช้หลายรายการพร้อมกัน ยอดประหยัดรวมอาจน้อยกว่าผลบวก', 'Worked out one at a time. Using several together may save less than the sum.')}
              </p>
            </div>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {items.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t(s.label, s.labelEn)}</span>
                  <span className="num block text-sm text-muted">
                    {t(`ใส่เพิ่มได้อีก ${fmt(s.room)} บาท`, `Room for ${fmt(s.room)} baht more`)} · {t(s.hint, s.hintEn)}
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-paper">
                    <span className="anim-grow block h-full rounded-full bg-refund" style={{ width: `${(s.saving / maxSaving) * 100}%` }} />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs text-muted">{t('ประหยัดได้', 'Saves')}</span>
                  <span className="num block font-display text-lg font-semibold text-refund">{fmt(s.saving)}</span>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onAdd} className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-ink shadow-md">
            {t('ไปกรอกค่าลดหย่อน', 'Go to deductions')}
          </button>
        </section>
      )}

      <WhatIf input={input} rules={rules} result={result} />

      <SpouseCompare input={input} rules={rules} />

      <button type="button" onClick={onMarket} className="card flex items-center gap-3 rounded-3xl p-4 text-left">
        <IconTile name="saving" />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{t('ตลาดหุ้นโลก', 'World markets')}</span>
          <span className="block text-sm text-muted">
            {t('ดูภาพรวม SET, S&P 500, Nikkei, ทองคำ และค่าเงินบาท พร้อมเรื่องภาษีที่เกี่ยวกับหุ้น', 'SET, S&P 500, Nikkei, gold and the baht at a glance, plus tax points on shares')}
          </span>
        </span>
        <span aria-hidden className="text-xl text-muted">→</span>
      </button>

      <section className="card rounded-3xl p-4 text-[15px]">
        <div className="mb-2 flex items-center gap-3">
          <IconTile name="shield" />
          <h2 className="text-lg font-semibold">{t('ก่อนซื้อเพื่อลดหย่อน', 'Before you buy for a deduction')}</h2>
        </div>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
          <li>{t('กองทุน RMF และ ThaiESG มีเงื่อนไขการถือครอง ถ้าขายก่อนกำหนดต้องคืนภาษีที่ได้ลดไป', 'RMF and ThaiESG have holding conditions. Selling early means paying back the tax you saved.')}</li>
          <li>{t('ซื้อเพราะเหมาะกับเป้าหมายการเงินของคุณ ภาษีที่ประหยัดได้เป็นผลพลอยได้', 'Buy because it fits your financial goals; the tax saving is a bonus.')}</li>
          <li>{t('เก็บหนังสือรับรองการซื้อหน่วยลงทุนและใบเสร็จเบี้ยประกันไว้เป็นหลักฐาน', 'Keep fund purchase certificates and premium receipts as evidence.')}</li>
        </ul>
      </section>
      <p className="text-xs text-muted">
        {t(
          `ปีภาษี ${rules.taxYear} · ตัวเลขเป็นการประมาณการเพื่อช่วยวางแผน ไม่ใช่คำแนะนำการลงทุน`,
          `Tax year ${rules.taxYear} · figures are estimates to help you plan, not investment advice`,
        )}
      </p>
    </div>
  )
}
