import { compareSpouseFiling } from '../engine/scenarios'
import type { TaxInput, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'
import { IconTile } from './icons'

/** การ์ดเทียบภาษีรวมของครอบครัว ระหว่างยื่นแยกกับยื่นรวม */
export function SpouseCompare({ input, rules }: { input: TaxInput; rules: TaxRules }) {
  const c = compareSpouseFiling(input, rules)
  if (!c) return null
  const rows = [
    { key: 'separate', label: 'ยื่นแยก', detail: `คุณ ${fmt(c.you.tax)} + คู่สมรส ${fmt(c.spouse.tax)}`, tax: c.separate.tax },
    { key: 'joint', label: 'ยื่นรวม', detail: `เงินได้สุทธิรวม ${fmt(c.joint.netIncome)} · ฐาน ${pct(c.joint.marginalRate)}`, tax: c.joint.tax },
  ] as const
  const max = Math.max(1, ...rows.map((r) => r.tax))
  return (
    <section className="card rounded-3xl p-4">
      <div className="mb-3 flex items-center gap-3">
        <IconTile name="family" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">ยื่นแยก หรือ ยื่นรวมกับคู่สมรส</h2>
          <p className="text-sm text-muted">เทียบภาษีรวมทั้งครอบครัว</p>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const best = c.better === r.key
          return (
            <li key={r.key} className={`rounded-2xl border-2 p-3 ${best ? 'border-refund bg-refund-soft/50' : 'border-line'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">
                  {r.label} {best && <span className="ml-1 rounded-full bg-refund px-2 py-0.5 text-xs text-surface">แนะนำ</span>}
                </span>
                <span className="num font-display text-lg font-semibold">{fmt(r.tax)}</span>
              </div>
              <p className="num text-xs text-muted">{r.detail}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
                <div className={`anim-grow h-full rounded-full ${best ? 'bg-refund' : 'bg-muted'}`} style={{ width: `${(r.tax / max) * 100}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-sm">
        {c.difference > 0 ? (
          <>
            <b>{c.better === 'separate' ? 'ยื่นแยก' : 'ยื่นรวม'}</b> เสียภาษีน้อยกว่า <b className="num">{fmt(c.difference)}</b> บาท
          </>
        ) : (
          'ทั้งสองแบบเสียภาษีเท่ากัน'
        )}
      </p>
      <p className="mt-1 text-xs text-muted">
        ยื่นแยก: ต่างฝ่ายต่างหักลดหย่อนบุตรได้เต็ม · ยื่นรวม: ใช้ค่าลดหย่อนคู่สมรสแทน และหักบุตรชุดเดียว · ตัวเลขยื่นรวมเป็นการประมาณการ
      </p>
    </section>
  )
}
