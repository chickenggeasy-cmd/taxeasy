import { Art } from '../components/Art'
import { IconTile, type IconName } from '../components/icons'
import { Staircase } from '../components/Staircase'
import type { TaxResult, TaxRules } from '../engine/types'
import { daysUntil, fmt, pct, thaiDate } from '../lib/format'
import { useAnimatedNumber } from '../lib/useAnimatedNumber'

function Row({ label, value, strong, sign }: { label: string; value: number; strong?: boolean; sign?: '−' | '=' }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <span className="min-w-0 text-[15px]">
        {sign && <span className="mr-1.5 inline-block w-3 text-muted">{sign}</span>}
        {label}
      </span>
      <span className="num shrink-0">{fmt(value)}</span>
    </div>
  )
}

export function Verdict({ result }: { result: TaxResult }) {
  const refund = result.balance < 0
  const zero = Math.abs(result.balance) < 0.005
  const amount = useAnimatedNumber(Math.abs(result.balance))
  const tone = zero ? 'bg-accent-soft text-accent' : refund ? 'bg-refund-soft text-refund' : 'bg-due-soft text-due'
  return (
    <div className={`flex items-center gap-3 rounded-3xl p-5 transition-colors duration-300 ${tone}`}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden className="text-xs">{zero ? '●' : refund ? '▲' : '▼'}</span>
          {zero ? 'ไม่ต้องจ่ายเพิ่ม และไม่มีเงินคืน' : refund ? 'คุณจะได้เงินภาษีคืน' : 'คุณต้องจ่ายภาษีเพิ่ม'}
        </p>
        <p className="num font-display text-[2.6rem] leading-tight font-semibold tracking-tight">฿{fmt(Math.round(amount))}</p>
        <p className="num text-sm text-ink/80">
          ภาษีทั้งปี {fmt(result.tax)} บาท · จ่ายไปแล้ว {fmt(result.credits)} บาท
        </p>
      </div>
      {refund && !zero && (
        <span className="hidden shrink-0 min-[360px]:block">
          <Art name="refund" alt="" className="block h-24 w-24 object-contain drop-shadow-sm" />
        </span>
      )}
    </div>
  )
}

function Ring({ value, label }: { value: number; label: string }) {
  // วงแหวนสัดส่วน (0–1) วาดด้วย stroke-dasharray
  const r = 22
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <svg viewBox="0 0 52 52" width="52" height="52" role="img" aria-label={label} className="shrink-0 -rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${c * v} ${c}`}
        className="transition-[stroke-dasharray] duration-700 ease-out"
      />
    </svg>
  )
}

/** แถบแสดงว่าเงินได้ทั้งปีแบ่งเป็นส่วนไหนบ้าง วาดตามสัดส่วนจริง */
function IncomeBar({ result }: { result: TaxResult }) {
  const total = result.totalIncome
  if (total <= 0) return null
  const deductions = Math.min(result.totalDeductions, result.incomeAfterExpenses)
  const parts = [
    { key: 'expense', label: 'ค่าใช้จ่าย', value: result.totalExpense + result.elderlyExemption, color: 'var(--muted)' },
    { key: 'deduction', label: 'ลดหย่อน', value: deductions, color: 'var(--refund)' },
    { key: 'net', label: 'เงินได้สุทธิที่คิดภาษี', value: result.netIncome, color: 'var(--accent)' },
  ].filter((p) => p.value > 0)
  return (
    <div className="flex flex-col gap-2">
      <div className="anim-grow flex h-3 overflow-hidden rounded-full bg-paper" role="img" aria-label="สัดส่วนเงินได้">
        {parts.map((p) => (
          <span key={p.key} className="h-full transition-[width] duration-500 ease-out first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {parts.map((p) => (
          <li key={p.key} className="num flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            {p.label} {pct(p.value / total)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <IconTile name={icon} />
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="num text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  )
}

export function Summary({ result, rules, compact = false, onStart }: { result: TaxResult; rules: TaxRules; compact?: boolean; onStart?: () => void }) {
  const online = daysUntil(rules.filingDeadlines.online)
  if (result.totalIncome === 0 && onStart) {
    return (
      <section className="card anim-stagger flex flex-col items-center gap-3 rounded-3xl p-6 text-center">
        <Art name="empty" alt="" className="block h-44 w-44 object-contain" />
        <h2 className="font-display text-xl font-semibold">ยังไม่มีรายได้ให้คำนวณ</h2>
        <p className="max-w-sm text-[15px] text-muted">เริ่มจากกรอกเงินเดือนทั้งปีและภาษีที่ถูกหักไว้ตามหนังสือรับรอง 50 ทวิ ใช้เวลาไม่ถึง 2 นาที</p>
        <button type="button" onClick={onStart} className="rounded-2xl bg-accent px-6 py-3 font-semibold text-accent-ink shadow-md">
          กรอกรายได้
        </button>
      </section>
    )
  }
  return (
    <div className="anim-stagger flex flex-col gap-4">
      <Verdict result={result} />

      <div className="grid grid-cols-2 gap-3">
        <div className="card rounded-2xl p-3.5">
          <p className="text-xs text-muted">ฐานภาษีสูงสุดของคุณ</p>
          <p className="num font-display text-[1.7rem] leading-tight font-semibold">{pct(result.marginalRate)}</p>
          <p className="num text-xs text-muted">ลดหย่อนเพิ่ม 10,000 ประหยัด {fmt(10_000 * result.marginalRate)}</p>
        </div>
        <div className="card flex items-center gap-3 rounded-2xl p-3.5">
          <Ring value={result.effectiveRate / 0.35} label={`อัตราภาษีจริง ${pct(result.effectiveRate)}`} />
          <div className="min-w-0">
            <p className="text-xs text-muted">อัตราภาษีจริง</p>
            <p className="num font-display text-[1.7rem] leading-tight font-semibold">{pct(result.effectiveRate)}</p>
            <p className="num truncate text-xs text-muted">ของเงินได้ {fmt(result.totalIncome)}</p>
          </div>
        </div>
      </div>

      {result.warnings.map((w) => (
        <p key={w} className="rounded-2xl bg-due-soft px-4 py-3 text-sm text-due">
          {w}
        </p>
      ))}

      <section className="card rounded-3xl p-4">
        <SectionTitle icon="receipt" title="ที่มาของตัวเลข" subtitle="เงินได้ทุก 100 บาทของคุณ ไปอยู่ส่วนไหน" />
        <IncomeBar result={result} />
        <div className="mt-3">
          <Row label="เงินได้ทั้งปี" value={result.totalIncome} />
          <Row sign="−" label="หักค่าใช้จ่าย" value={result.totalExpense} />
          {result.elderlyExemption > 0 && <Row sign="−" label="ยกเว้นผู้สูงอายุ/ผู้พิการ" value={result.elderlyExemption} />}
          <Row sign="−" label="หักค่าลดหย่อน" value={result.totalDeductions} />
          <div className="my-1 border-t border-dashed border-line" />
          <Row sign="=" label="เงินได้สุทธิ" value={result.netIncome} strong />
          <Row label="ภาษีตามขั้นบันได" value={result.progressiveTax} />
          {result.minimumTax !== null && <Row label="ภาษีวิธี 0.5% ของเงินได้ (40(2)–40(8))" value={result.minimumTax} />}
          {result.usedMinimumTax && <p className="text-sm text-due">วิธี 0.5% ได้ยอดสูงกว่า กฎหมายให้ใช้ยอดที่สูงกว่า</p>}
          <Row sign="−" label="ภาษีหัก ณ ที่จ่าย / ชำระแล้ว" value={result.credits} />
          <div className="my-1 border-t border-dashed border-line" />
          <Row label={result.balance < 0 ? 'ได้คืน' : 'จ่ายเพิ่ม'} value={Math.abs(result.balance)} strong />
        </div>
      </section>

      {!compact && (
        <section className="card rounded-3xl p-4">
          <SectionTitle icon="saving" title="บันไดภาษีของคุณ" subtitle={`เงินได้สุทธิ ${fmt(result.netIncome)} บาท เสียภาษีแยกตามขั้น`} />
          <Staircase result={result} />
        </section>
      )}

      {!compact && result.deductions.length > 0 && (
        <section className="card rounded-3xl p-4">
          <SectionTitle icon="shield" title="ค่าลดหย่อนที่ใช้" subtitle={`รวม ${fmt(result.totalDeductions)} บาท`} />
          <ul className="flex flex-col divide-y divide-line">
            {result.deductions.map((d) => (
              <li key={d.id} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 text-[15px]">
                  {d.label}
                  {d.note && <span className="block text-xs text-muted">{d.note}</span>}
                </span>
                <span className="num shrink-0">{fmt(d.allowed)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!compact && (
        <div className="card flex items-center gap-3 rounded-2xl px-4 py-3">
          <IconTile name="calendar" size={36} />
          <p className="min-w-0 text-sm text-muted">
            ยื่นออนไลน์ได้ถึง <b className="text-ink">{thaiDate(rules.filingDeadlines.online)}</b>
            {online >= 0 && online <= 200 ? ` (อีก ${online} วัน)` : ''} · แบบกระดาษถึง {thaiDate(rules.filingDeadlines.paper)}
          </p>
        </div>
      )}
    </div>
  )
}
