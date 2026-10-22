import { useMemo, useState } from 'react'
import { applyPlan, GOALS, planBudget, type BudgetGoal } from '../engine/optimizer'
import type { TaxInput, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'
import { IconTile } from './icons'
import { MoneyField, Segmented } from './ui'

type Update = (fn: (draft: TaxInput) => void) => void

/** "มีงบเท่านี้ ลงอะไรดี" */
export function BudgetPlanner({ input, rules, update }: { input: TaxInput; rules: TaxRules; update: Update }) {
  const [budget, setBudget] = useState(50_000)
  const [goal, setGoal] = useState<BudgetGoal>('flex')
  const [applied, setApplied] = useState<{ total: number; saving: number } | null>(null)
  const plan = useMemo(() => planBudget(input, rules, budget, goal), [input, rules, budget, goal])
  const max = Math.max(1, ...plan.items.map((i) => i.amount))

  return (
    <section className="card flex flex-col gap-4 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <IconTile name="coins" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">มีงบเท่านี้ ลงอะไรดี</h2>
          <p className="text-sm text-muted">ใส่งบที่พร้อมลงทุนปีนี้ แอปจัดให้ได้ภาษีคืนมากที่สุด</p>
        </div>
      </div>

      <MoneyField id="budget" label="งบที่มี" value={budget} onChange={(v) => (setBudget(v), setApplied(null))} />
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">เป้าหมาย</span>
        <Segmented label="เป้าหมาย" value={goal} options={(Object.keys(GOALS) as BudgetGoal[]).map((g) => ({ value: g, label: GOALS[g].label }))} onChange={(g) => (setGoal(g), setApplied(null))} />
        <p className="text-sm text-muted">{GOALS[goal].hint} · ทุกตัวลดภาษีได้บาทต่อบาทเท่ากัน ต่างกันที่เงื่อนไขและประโยชน์อื่น</p>
      </div>

      {applied ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-refund-soft p-4 text-refund">
          <p className="font-semibold">✓ ใส่แผนในค่าลดหย่อนแล้ว</p>
          <p className="num text-sm text-ink">
            ลงเพิ่ม {fmt(applied.total)} บาท ภาษีลดลง {fmt(applied.saving)} บาท ดูหรือแก้ตัวเลขได้ที่แท็บลดหย่อน
          </p>
          <button type="button" onClick={() => setApplied(null)} className="self-start rounded-xl bg-surface px-3 py-1.5 text-sm font-semibold text-accent">
            วางแผนเพิ่ม
          </button>
        </div>
      ) : plan.taxBefore === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-3 text-[15px]">ตอนนี้คุณไม่เสียภาษีอยู่แล้ว ไม่จำเป็นต้องซื้อกองทุนหรือประกันเพื่อลดหย่อนเพิ่ม</p>
      ) : plan.items.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-3 text-[15px]">ใช้สิทธิลดหย่อนเต็มเพดานแล้ว หรืองบยังไม่พอ</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {plan.items.map((i) => (
              <li key={i.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{i.label}</span>
                    <span className="block text-xs text-muted">{i.hint}</span>
                  </span>
                  <span className="num shrink-0 font-semibold">{fmt(i.amount)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper">
                  <div className="anim-grow h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(i.amount / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-refund-soft p-3 text-refund">
              <p className="text-xs font-semibold">▼ ภาษีลดลง</p>
              <p className="num font-display text-2xl font-semibold">{fmt(plan.saving)}</p>
              <p className="num text-xs">คิดเป็น {pct(plan.total ? plan.saving / plan.total : 0)} ของเงินที่ลง</p>
            </div>
            <div className="rounded-2xl bg-paper p-3">
              <p className="text-xs text-muted">ภาษีทั้งปี</p>
              <p className="num font-display text-2xl font-semibold">{fmt(plan.taxAfter)}</p>
              <p className="num text-xs text-muted">จากเดิม {fmt(plan.taxBefore)}</p>
            </div>
          </div>

          {plan.usefulLimit > 0 && budget > plan.total && (
            <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
              ใช้แค่ <b className="num">{fmt(plan.total)}</b> บาทก็พอ ใส่เกินกว่านี้ภาษีไม่ลดลงอีก เงินที่เหลือเก็บไว้ลงทุนแบบอื่นได้
            </p>
          )}
          {plan.usefulLimit > budget && (
            <p className="text-sm text-muted">
              ถ้ามีงบมากขึ้น ลงได้สูงสุดอย่างคุ้มค่าถึง <b className="num text-ink">{fmt(plan.usefulLimit)}</b> บาท
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              const next = applyPlan(input, plan)
              update((d) => void (d.deductions = next.deductions))
              setApplied({ total: plan.total, saving: plan.saving })
            }}
            className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-ink shadow-md"
          >
            ใส่แผนนี้ในค่าลดหย่อน
          </button>
        </>
      )}
      <p className="text-xs text-muted">เป็นการคำนวณด้านภาษีเท่านั้น ไม่ใช่คำแนะนำการลงทุน ศึกษาความเสี่ยงและเงื่อนไขของแต่ละกองทุนก่อนซื้อ</p>
    </section>
  )
}
