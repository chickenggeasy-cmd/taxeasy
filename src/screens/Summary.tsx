import { Art } from '../components/Art'
import { Staircase } from '../components/Staircase'
import type { TaxResult, TaxRules } from '../engine/types'
import { daysUntil, fmt, pct, thaiDate } from '../lib/format'

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
  const tone = zero ? 'bg-accent-soft text-accent' : refund ? 'bg-refund-soft text-refund' : 'bg-due-soft text-due'
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-5 ${tone}`}>
      <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">{zero ? 'ไม่ต้องจ่ายเพิ่ม และไม่มีเงินคืน' : refund ? 'คุณจะได้เงินภาษีคืน' : 'คุณต้องจ่ายภาษีเพิ่ม'}</p>
      <p className="num font-display text-[2.6rem] leading-tight font-semibold">
        ฿{fmt(Math.abs(result.balance))}
      </p>
      <p className="num text-sm text-ink">
        ภาษีทั้งปี {fmt(result.tax)} บาท · จ่ายไปแล้ว {fmt(result.credits)} บาท
      </p>
      </div>
      {refund && !zero && (
        <span className="hidden shrink-0 overflow-hidden rounded-2xl bg-art min-[360px]:block">
          <Art name="refund" alt="" className="block h-24 w-24 object-contain" />
        </span>
      )}
    </div>
  )
}

export function Summary({ result, rules, compact = false, onStart }: { result: TaxResult; rules: TaxRules; compact?: boolean; onStart?: () => void }) {
  const online = daysUntil(rules.filingDeadlines.online)
  if (result.totalIncome === 0 && onStart) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-center">
        <span className="overflow-hidden rounded-2xl bg-art">
          <Art name="empty" alt="" className="block h-40 w-40 object-contain" />
        </span>
        <h2 className="text-xl font-semibold">ยังไม่มีรายได้ให้คำนวณ</h2>
        <p className="max-w-sm text-[15px] text-muted">เริ่มจากกรอกเงินเดือนทั้งปีและภาษีที่ถูกหักไว้ตามหนังสือรับรอง 50 ทวิ ใช้เวลาไม่ถึง 2 นาที</p>
        <button type="button" onClick={onStart} className="rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink">
          กรอกรายได้
        </button>
      </section>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <Verdict result={result} />

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-xs text-muted">ฐานภาษีสูงสุดของคุณ</p>
          <p className="num font-display text-2xl font-semibold">{pct(result.marginalRate)}</p>
          <p className="num text-xs text-muted">ลดหย่อนเพิ่ม 10,000 ประหยัด {fmt(10_000 * result.marginalRate)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-xs text-muted">อัตราภาษีจริงเทียบรายได้</p>
          <p className="num font-display text-2xl font-semibold">{pct(result.effectiveRate)}</p>
          <p className="num text-xs text-muted">จากเงินได้ {fmt(result.totalIncome)}</p>
        </div>
      </div>

      {result.warnings.map((w) => (
        <p key={w} className="rounded-xl bg-due-soft px-4 py-3 text-sm text-due">
          {w}
        </p>
      ))}

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-lg font-semibold">ที่มาของตัวเลข</h2>
        <Row label="เงินได้ทั้งปี" value={result.totalIncome} />
        <Row sign="−" label="หักค่าใช้จ่าย" value={result.totalExpense} />
        {result.elderlyExemption > 0 && <Row sign="−" label="ยกเว้นผู้สูงอายุ/ผู้พิการ" value={result.elderlyExemption} />}
        <Row sign="−" label="หักค่าลดหย่อน" value={result.totalDeductions} />
        <div className="my-1 border-t border-dashed border-line" />
        <Row sign="=" label="เงินได้สุทธิ" value={result.netIncome} strong />
        <Row label="ภาษีตามขั้นบันได" value={result.progressiveTax} />
        {result.minimumTax !== null && (
          <Row label="ภาษีวิธี 0.5% ของเงินได้ (40(2)–40(8))" value={result.minimumTax} />
        )}
        {result.usedMinimumTax && (
          <p className="text-sm text-due">วิธี 0.5% ได้ยอดสูงกว่า กฎหมายให้ใช้ยอดที่สูงกว่า</p>
        )}
        <Row sign="−" label="ภาษีหัก ณ ที่จ่าย / ชำระแล้ว" value={result.credits} />
        <div className="my-1 border-t border-dashed border-line" />
        <Row label={result.balance < 0 ? 'ได้คืน' : 'จ่ายเพิ่ม'} value={Math.abs(result.balance)} strong />
      </section>

      {!compact && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-lg font-semibold">บันไดภาษีของคุณ</h2>
          <p className="mb-3 text-sm text-muted">เงินได้สุทธิ {fmt(result.netIncome)} บาท เสียภาษีแยกตามขั้น</p>
          <Staircase result={result} />
        </section>
      )}

      {!compact && result.deductions.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-2 text-lg font-semibold">ค่าลดหย่อนที่ใช้</h2>
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
        <p className="rounded-xl border border-line px-4 py-3 text-sm text-muted">
          ยื่นออนไลน์ได้ถึง <b className="text-ink">{thaiDate(rules.filingDeadlines.online)}</b>
          {online >= 0 && online <= 200 ? ` (อีก ${online} วัน)` : ''} · แบบกระดาษถึง {thaiDate(rules.filingDeadlines.paper)}
        </p>
      )}
    </div>
  )
}
