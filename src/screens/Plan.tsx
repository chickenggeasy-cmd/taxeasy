import { planSuggestions } from '../engine/plan'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'

export function Plan({ input, rules, result, onAdd }: { input: TaxInput; rules: TaxRules; result: TaxResult; onAdd: () => void }) {
  const items = planSuggestions(input, rules)
  const zeroTax = result.tax === 0

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-accent-soft p-5">
        <p className="text-sm font-semibold text-accent">ฐานภาษีสูงสุดของคุณ</p>
        <p className="num font-display text-4xl font-semibold text-accent">{pct(result.marginalRate)}</p>
        <p className="mt-1 text-[15px]">
          {result.marginalRate > 0
            ? `ทุก ๆ 10,000 บาทที่ลดหย่อนเพิ่ม จะเสียภาษีน้อยลงประมาณ ${fmt(10_000 * result.marginalRate)} บาท`
            : 'ตอนนี้คุณยังไม่เสียภาษีตามขั้นบันได การซื้อกองทุนหรือประกันเพื่อลดหย่อนจะไม่ช่วยลดภาษีเพิ่ม'}
        </p>
        {result.usedMinimumTax && (
          <p className="mt-2 text-sm text-due">ภาษีของคุณคิดจากวิธี 0.5% ของเงินได้ ค่าลดหย่อนเพิ่มจะไม่ช่วยลดภาษีส่วนนี้</p>
        )}
      </section>

      {!zeroTax && items.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-lg font-semibold">ยังใช้สิทธิได้อีก</h2>
          <p className="mb-3 text-sm text-muted">คิดทีละรายการ ถ้าใช้หลายรายการพร้อมกัน ยอดประหยัดรวมอาจน้อยกว่าผลบวก</p>
          <ul className="flex flex-col divide-y divide-line">
            {items.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold">{s.label}</span>
                  <span className="num block text-sm text-muted">ใส่เพิ่มได้อีก {fmt(s.room)} บาท · {s.hint}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs text-muted">ประหยัดได้</span>
                  <span className="num block font-display text-lg font-semibold text-refund">{fmt(s.saving)}</span>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onAdd} className="mt-3 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink">
            ไปกรอกค่าลดหย่อน
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 text-[15px]">
        <h2 className="mb-2 text-lg font-semibold">ก่อนซื้อเพื่อลดหย่อน</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
          <li>กองทุน RMF และ ThaiESG มีเงื่อนไขการถือครอง ถ้าขายก่อนกำหนดต้องคืนภาษีที่ได้ลดไป</li>
          <li>ซื้อเพราะเหมาะกับเป้าหมายการเงินของคุณ ภาษีที่ประหยัดได้เป็นผลพลอยได้</li>
          <li>เก็บหนังสือรับรองการซื้อหน่วยลงทุนและใบเสร็จเบี้ยประกันไว้เป็นหลักฐาน</li>
        </ul>
      </section>
      <p className="text-xs text-muted">ปีภาษี {rules.taxYear} · ตัวเลขเป็นการประมาณการเพื่อช่วยวางแผน ไม่ใช่คำแนะนำการลงทุน</p>
    </div>
  )
}
