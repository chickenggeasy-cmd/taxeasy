import { useState } from 'react'
import { Art } from '../components/Art'
import { Icon, IconTile, type IconName } from '../components/icons'
import { FilingNotice } from '../components/FilingNotice'
import { ShareCard } from '../components/ShareCard'
import { Staircase } from '../components/Staircase'
import type { TaxResult, TaxRules } from '../engine/types'
import { downloadIcs } from '../lib/calendar'
import type { FilingRequirement } from '../lib/filing'
import { dateText, daysUntil, fmt, pct, updatedText } from '../lib/format'
import { useLang, useT } from '../lib/lang'
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
  const t = useT()
  const refund = result.balance < 0
  const zero = Math.abs(result.balance) < 0.005
  const amount = useAnimatedNumber(Math.abs(result.balance))
  const tone = zero ? 'bg-accent-soft text-accent' : refund ? 'bg-refund-soft text-refund' : 'bg-due-soft text-due'
  return (
    <div className={`flex items-center gap-3 rounded-3xl p-5 transition-colors duration-300 ${tone}`}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden className="text-xs">{zero ? '●' : refund ? '▲' : '▼'}</span>
          {zero
            ? t('ไม่ต้องจ่ายเพิ่ม และไม่มีเงินคืน', 'Nothing to pay and no refund')
            : refund
              ? t('คุณจะได้เงินภาษีคืน', 'You will get a tax refund')
              : t('คุณต้องจ่ายภาษีเพิ่ม', 'You owe more tax')}
        </p>
        <p className="num font-display text-[2.6rem] leading-tight font-semibold tracking-tight">฿{fmt(Math.round(amount))}</p>
        <p className="num text-sm text-ink/80">
          {t(`ภาษีทั้งปี ${fmt(result.tax)} บาท · จ่ายไปแล้ว ${fmt(result.credits)} บาท`, `Tax for the year ฿${fmt(result.tax)} · already paid ฿${fmt(result.credits)}`)}
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
  const t = useT()
  const total = result.totalIncome
  if (total <= 0) return null
  const deductions = Math.min(result.totalDeductions, result.incomeAfterExpenses)
  const parts = [
    { key: 'expense', label: t('ค่าใช้จ่าย', 'Expenses'), value: result.totalExpense + result.elderlyExemption, color: 'var(--muted)' },
    { key: 'deduction', label: t('ลดหย่อน', 'Deductions'), value: deductions, color: 'var(--refund)' },
    { key: 'net', label: t('เงินได้สุทธิที่คิดภาษี', 'Taxable net income'), value: result.netIncome, color: 'var(--accent)' },
  ].filter((p) => p.value > 0)
  return (
    <div className="flex flex-col gap-2">
      <div className="anim-grow flex h-3 overflow-hidden rounded-full bg-paper" role="img" aria-label={t('สัดส่วนเงินได้', 'Income split')}>
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

export function Summary({
  result,
  rules,
  filing,
  compact = false,
  onStart,
  onFiling,
  onFeedback,
}: {
  result: TaxResult
  rules: TaxRules
  filing?: FilingRequirement | null
  compact?: boolean
  onStart?: () => void
  onFiling?: () => void
  onFeedback?: () => void
}) {
  const online = daysUntil(rules.filingDeadlines.online)
  const [sharing, setSharing] = useState(false)
  const t = useT()
  const lang = useLang()
  if (result.totalIncome === 0 && onStart) {
    return (
      <section className="card anim-stagger flex flex-col items-center gap-3 rounded-3xl p-6 text-center">
        <Art name="empty" alt="" className="block h-44 w-44 object-contain" />
        <h2 className="font-display text-xl font-semibold">{t('ยังไม่มีรายได้ให้คำนวณ', 'No income to calculate yet')}</h2>
        <p className="max-w-sm text-[15px] text-muted">
          {t(
            'เริ่มจากกรอกเงินเดือนทั้งปีและภาษีที่ถูกหักไว้ตามหนังสือรับรอง 50 ทวิ ใช้เวลาไม่ถึง 2 นาที',
            'Start with your annual salary and the tax withheld on your 50 Tawi certificate. It takes under 2 minutes.',
          )}
        </p>
        <button type="button" onClick={onStart} className="rounded-2xl bg-accent px-6 py-3 font-semibold text-accent-ink shadow-md">
          {t('กรอกรายได้', 'Enter income')}
        </button>
      </section>
    )
  }
  return (
    <div className="anim-stagger flex flex-col gap-4">
      <Verdict result={result} />
      {filing && <FilingNotice filing={filing} onFiling={compact ? undefined : onFiling} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="card rounded-2xl p-3.5">
          <p className="text-xs text-muted">{t('ฐานภาษีสูงสุดของคุณ', 'Your top tax rate')}</p>
          <p className="num font-display text-[1.7rem] leading-tight font-semibold">{pct(result.marginalRate)}</p>
          <p className="num text-xs text-muted">
            {t(`ลดหย่อนเพิ่ม 10,000 ประหยัด ${fmt(10_000 * result.marginalRate)}`, `An extra 10,000 deduction saves ${fmt(10_000 * result.marginalRate)}`)}
          </p>
        </div>
        <div className="card flex items-center gap-3 rounded-2xl p-3.5">
          <Ring value={result.effectiveRate / 0.35} label={`${t('อัตราภาษีจริง', 'Effective tax rate')} ${pct(result.effectiveRate)}`} />
          <div className="min-w-0">
            <p className="text-xs text-muted">{t('อัตราภาษีจริง', 'Effective tax rate')}</p>
            <p className="num font-display text-[1.7rem] leading-tight font-semibold">{pct(result.effectiveRate)}</p>
            <p className="num text-xs text-muted">{t(`ของเงินได้ ${fmt(result.totalIncome)}`, `of income ฿${fmt(result.totalIncome)}`)}</p>
          </div>
        </div>
      </div>

      {result.warnings.map((w) => (
        <p key={w} className="rounded-2xl bg-due-soft px-4 py-3 text-sm text-due">
          {w}
        </p>
      ))}

      <section className="card rounded-3xl p-4">
        <SectionTitle icon="receipt" title={t('ที่มาของตัวเลข', 'Where the numbers come from')} subtitle={t('เงินได้ทุก 100 บาทของคุณ ไปอยู่ส่วนไหน', 'Where every 100 baht of your income goes')} />
        <IncomeBar result={result} />
        <div className="mt-3">
          <Row label={t('เงินได้ทั้งปี', 'Total income')} value={result.totalIncome} />
          <Row sign="−" label={t('หักค่าใช้จ่าย', 'Expense allowance')} value={result.totalExpense} />
          {result.elderlyExemption > 0 && <Row sign="−" label={t('ยกเว้นผู้สูงอายุ/ผู้พิการ', 'Senior or disability exemption')} value={result.elderlyExemption} />}
          <Row sign="−" label={t('หักค่าลดหย่อน', 'Deductions')} value={result.totalDeductions} />
          <div className="my-1 border-t border-dashed border-line" />
          <Row sign="=" label={t('เงินได้สุทธิ', 'Net taxable income')} value={result.netIncome} strong />
          <Row label={t('ภาษีตามขั้นบันได', 'Tax by brackets')} value={result.progressiveTax} />
          {result.minimumTax !== null && <Row label={t('ภาษีวิธี 0.5% ของเงินได้ (40(2)–40(8))', 'Flat 0.5% tax (40(2)–40(8))')} value={result.minimumTax} />}
          {result.usedMinimumTax && (
            <p className="text-sm text-due">{t('วิธี 0.5% ได้ยอดสูงกว่า กฎหมายให้ใช้ยอดที่สูงกว่า', 'The 0.5% method gives the higher amount, and the law requires using it.')}</p>
          )}
          <Row sign="−" label={t('ภาษีหัก ณ ที่จ่าย / ชำระแล้ว', 'Tax withheld / already paid')} value={result.credits - result.dividendCredit - result.foreignTaxCredit} />
          {result.dividendCredit > 0 && <Row sign="−" label={t('เครดิตภาษีเงินปันผล', 'Dividend tax credit')} value={result.dividendCredit} />}
          {result.foreignTaxCredit > 0 && <Row sign="−" label={t('เครดิตภาษีที่เสียในต่างประเทศ', 'Foreign tax credit')} value={result.foreignTaxCredit} />}
          <div className="my-1 border-t border-dashed border-line" />
          <Row label={result.balance < 0 ? t('ได้คืน', 'Refund') : t('จ่ายเพิ่ม', 'Amount due')} value={Math.abs(result.balance)} strong />
        </div>
        {onFeedback && !__PREVIEW__ && (
          <button type="button" onClick={onFeedback} className="mt-2 text-sm font-semibold text-accent">
            {t('ตัวเลขไม่ตรงกับที่ยื่นจริง? แจ้งเรา →', 'Numbers differ from what you filed? Tell us →')}
          </button>
        )}
      </section>

      {!compact && (
        <section className="card rounded-3xl p-4">
          <SectionTitle icon="saving" title={t('บันไดภาษีของคุณ', 'Your tax brackets')} subtitle={t(`เงินได้สุทธิ ${fmt(result.netIncome)} บาท เสียภาษีแยกตามขั้น`, `Net income ฿${fmt(result.netIncome)}, taxed by bracket`)} />
          <Staircase result={result} />
        </section>
      )}

      {!compact && result.deductions.length > 0 && (
        <section className="card rounded-3xl p-4">
          <SectionTitle icon="shield" title={t('ค่าลดหย่อนที่ใช้', 'Deductions used')} subtitle={t(`รวม ${fmt(result.totalDeductions)} บาท`, `Total ฿${fmt(result.totalDeductions)}`)} />
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

      {!compact && onFiling && (
        <button type="button" onClick={onFiling} className="flex items-center gap-3 rounded-3xl bg-accent p-4 text-left text-accent-ink shadow-md">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-ink/15">
            <Icon name="send" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold">{t('พร้อมยื่นภาษีแล้ว?', 'Ready to file?')}</span>
            <span className="block text-sm opacity-85">{t('ดูทีละขั้นว่ากรอกอะไรใน e-Filing และต้องเตรียมเอกสารอะไร', 'Step by step: what to enter in e-Filing and what to prepare')}</span>
          </span>
          <span aria-hidden className="text-xl">→</span>
        </button>
      )}

      {!compact && (
        <div className="card flex items-center gap-3 rounded-2xl px-4 py-3">
          <IconTile name="calendar" size={36} />
          <p className="min-w-0 flex-1 text-sm text-muted">
            {t('ยื่นออนไลน์ได้ถึง', 'Online filing until')} <b className="text-ink">{dateText(rules.filingDeadlines.online, lang)}</b>
            {online >= 0 && online <= 200 ? t(` (อีก ${online} วัน)`, ` (${online} days left)`) : ''} · {t('แบบกระดาษถึง', 'Paper filing until')} {dateText(rules.filingDeadlines.paper, lang)}
          </p>
          {!__PREVIEW__ && (
            <button type="button" onClick={() => downloadIcs(rules)} className="shrink-0 rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
              {t('เพิ่มลงปฏิทิน', 'Add to calendar')}
            </button>
          )}
        </div>
      )}

      {!compact && !__PREVIEW__ && result.totalIncome > 0 &&
        (sharing ? (
          <ShareCard result={result} rules={rules} onClose={() => setSharing(false)} />
        ) : (
          <button type="button" onClick={() => setSharing(true)} className="card flex items-center gap-3 rounded-2xl px-4 py-3 text-left">
            <IconTile name="share" size={36} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('แชร์ผลลัพธ์เป็นรูป', 'Share as an image')}</span>
              <span className="block text-sm text-muted">{t('เลือกซ่อนยอดเงินได้ ส่งให้เพื่อนหรือเก็บไว้ดู', 'Hide the amounts if you like. Send it to a friend or keep it.')}</span>
            </span>
            <span aria-hidden className="text-xl text-muted">→</span>
          </button>
        ))}

      {!compact && <RulesUsed rules={rules} />}
    </div>
  )
}

/** กฎที่ใช้คำนวณ พร้อมแหล่งอ้างอิงที่กดเปิดดูได้ — ให้ผู้ใช้ตรวจย้อนกลับได้ว่าตัวเลขมาจากไหน */
function RulesUsed({ rules }: { rules: TaxRules }) {
  const t = useT()
  const lang = useLang()
  const sources = rules.sources ?? []
  return (
    <details className="card rounded-2xl px-4 py-3 text-sm">
      <summary className="cursor-pointer font-semibold text-accent">
        {t(`กฎที่ใช้คำนวณ: ปี ${rules.taxYear} ฉบับที่ ${rules.revision}`, `Rules used: tax year ${rules.taxYear}, revision ${rules.revision}`)}
      </summary>
      <p className="mt-2 text-muted">
        {t(`ปรับปรุงเมื่อ ${updatedText(rules.updatedAt, lang)}`, `Last updated ${updatedText(rules.updatedAt, lang)}`)}
      </p>
      {rules.notes && <p className="mt-1 text-muted">{rules.notes}</p>}
      {sources.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {sources.map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noreferrer" className="break-words text-accent underline underline-offset-2">
                {src.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
