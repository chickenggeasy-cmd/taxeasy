import { compareSpouseFiling } from '../engine/scenarios'
import type { TaxInput, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'
import { useT } from '../lib/lang'
import { IconTile } from './icons'

/** การ์ดเทียบภาษีรวมของครอบครัว ระหว่างยื่นแยกกับยื่นรวม */
export function SpouseCompare({ input, rules }: { input: TaxInput; rules: TaxRules }) {
  const t = useT()
  const c = compareSpouseFiling(input, rules)
  if (!c) return null
  const separate = t('ยื่นแยก', 'File separately')
  const joint = t('ยื่นรวม', 'File jointly')
  const rows = [
    { key: 'separate', label: separate, detail: t(`คุณ ${fmt(c.you.tax)} + คู่สมรส ${fmt(c.spouse.tax)}`, `You ${fmt(c.you.tax)} + spouse ${fmt(c.spouse.tax)}`), tax: c.separate.tax },
    {
      key: 'joint',
      label: joint,
      detail: t(
        `เงินได้สุทธิรวม ${fmt(c.joint.netIncome)} · ฐาน ${pct(c.joint.marginalRate)}`,
        `Combined net income ${fmt(c.joint.netIncome)} · bracket ${pct(c.joint.marginalRate)}`,
      ),
      tax: c.joint.tax,
    },
  ] as const
  const max = Math.max(1, ...rows.map((r) => r.tax))
  return (
    <section className="card rounded-3xl p-4">
      <div className="mb-3 flex items-center gap-3">
        <IconTile name="family" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t('ยื่นแยก หรือ ยื่นรวมกับคู่สมรส', 'File separately or jointly with your spouse')}</h2>
          <p className="text-sm text-muted">{t('เทียบภาษีรวมทั้งครอบครัว', 'Compares total tax for the household')}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const best = c.better === r.key
          return (
            <li key={r.key} className={`rounded-2xl border-2 p-3 ${best ? 'border-refund bg-refund-soft/50' : 'border-line'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">
                  {r.label} {best && <span className="ml-1 rounded-full bg-refund px-2 py-0.5 text-xs text-surface">{t('แนะนำ', 'Best')}</span>}
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
            <b>{c.better === 'separate' ? separate : joint}</b> {t('เสียภาษีน้อยกว่า', 'costs')} <b className="num">{fmt(c.difference)}</b>{' '}
            {t('บาท', 'baht less in tax')}
          </>
        ) : (
          t('ทั้งสองแบบเสียภาษีเท่ากัน', 'Both options cost the same tax')
        )}
      </p>
      <p className="mt-1 text-xs text-muted">
        {t(
          'ยื่นแยก: ต่างฝ่ายต่างหักลดหย่อนบุตรได้เต็ม · ยื่นรวม: ใช้ค่าลดหย่อนคู่สมรสแทน และหักบุตรชุดเดียว · ตัวเลขยื่นรวมเป็นการประมาณการ',
          'Separate: each of you claims the full child allowance · Joint: the spouse allowance applies instead, and children are claimed once · Joint figures are estimates',
        )}
      </p>
    </section>
  )
}
