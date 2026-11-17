import { useState } from 'react'
import { FiledCompare } from '../components/FiledCompare'
import { FilingNotice } from '../components/FilingNotice'
import { Icon, IconTile } from '../components/icons'
import { PageHero } from '../components/ui'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { downloadIcs } from '../lib/calendar'
import { documentChecklist, filingRequirement, filingSteps, formType } from '../lib/filing'
import { dateText, fmt } from '../lib/format'
import { useLang, useT } from '../lib/lang'
import { readJSON, writeJSON } from '../lib/storage'

function CopyButton({ value }: { value: number }) {
  const t = useT()
  const [done, setDone] = useState(false)
  const text = String(Math.round(value * 100) / 100)
  return (
    <button
      type="button"
      aria-label={t(`คัดลอก ${fmt(value)}`, `Copy ${fmt(value)}`)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          // คัดลอกไม่ได้: ให้ผู้ใช้เลือกข้อความเอง
        }
      }}
      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${done ? 'bg-refund-soft text-refund' : 'bg-paper text-muted hover:text-ink'}`}
    >
      {done ? t('คัดลอกแล้ว', 'Copied') : t('คัดลอก', 'Copy')}
    </button>
  )
}

export function Filing({
  input,
  result,
  rules,
  onBack,
  onFeedback,
}: {
  input: TaxInput
  result: TaxResult
  rules: TaxRules
  onBack: () => void
  onFeedback?: () => void
}) {
  const t = useT()
  const lang = useLang()
  const steps = filingSteps(input, result, rules, lang)
  const filing = filingRequirement(input, result, rules)
  const docs = documentChecklist(input, rules, lang)
  const docsKey = `taxeasy:docs:${rules.taxYear}`
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readJSON(docsKey) ?? {})
  const done = docs.filter((d) => checked[d.id]).length

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    writeJSON(docsKey, next)
  }

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        {t('← กลับ', '← Back')}
      </button>
      <PageHero
        art="more"
        title={t('ยื่นภาษีจริง', 'File your return')}
        subtitle={
          lang === 'en'
            ? `Form ${formType(input) === 'PND91' ? 'P.N.D. 91' : 'P.N.D. 90'} · online until ${dateText(rules.filingDeadlines.online, lang)}`
            : `แบบ ${formType(input) === 'PND91' ? 'ภ.ง.ด.91' : 'ภ.ง.ด.90'} · ยื่นออนไลน์ได้ถึง ${dateText(rules.filingDeadlines.online, lang)}`
        }
      />
      {filing && <FilingNotice filing={filing} />}

      {!__PREVIEW__ && (
        <button type="button" onClick={() => downloadIcs(rules, lang)} className="card flex items-center gap-3 rounded-2xl px-4 py-3 text-left">
          <IconTile name="calendar" size={36} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('เพิ่มวันครบกำหนดลงปฏิทิน', 'Add the deadline to your calendar')}</span>
            <span className="block text-sm text-muted">{t('ปฏิทินในมือถือจะเตือนล่วงหน้า 7 วัน และ 1 วัน', 'Your phone calendar will remind you 7 days and 1 day before')}</span>
          </span>
          <span aria-hidden className="text-xl text-muted">+</span>
        </button>
      )}

      <section className="card rounded-3xl p-4">
        <div className="mb-3 flex items-center gap-3">
          <IconTile name="receipt" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{t('เตรียมเอกสาร', 'Documents to prepare')}</h2>
            <p className="num text-sm text-muted">
              {t(`เตรียมแล้ว ${done} จาก ${docs.length} รายการ`, `${done} of ${docs.length} ready`)}
            </p>
          </div>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-refund transition-[width] duration-500 ease-out" style={{ width: `${docs.length ? (done / docs.length) * 100 : 0}%` }} />
        </div>
        <ul className="flex flex-col gap-1">
          {docs.map((d) => (
            <li key={d.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-2 py-2.5 hover:bg-paper">
                <input type="checkbox" id={`doc-${d.id}`} checked={!!checked[d.id]} onChange={() => toggle(d.id)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--refund)]" />
                <span className="min-w-0">
                  <span className={`block font-semibold ${checked[d.id] ? 'text-muted line-through' : ''}`}>{d.title}</span>
                  <span className="block text-sm text-muted">{d.detail}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-2 text-xs text-muted">
          {t('เก็บเอกสารทั้งหมดไว้อย่างน้อย 5 ปี เผื่อกรมสรรพากรขอตรวจ', 'Keep all documents for at least 5 years in case the Revenue Department asks to see them.')}
        </p>
      </section>

      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.id} className="card rounded-3xl p-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-display font-semibold text-accent-ink">{i + 1}</span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{s.title}</h2>
                {s.detail && <p className="text-sm text-muted">{s.detail}</p>}
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {s.fields.map((f) => (
                <li key={f.label} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[15px]">{f.label}</span>
                    {f.note && <span className="block text-xs text-muted">{f.note}</span>}
                  </span>
                  {f.amount !== undefined ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="num font-semibold">{fmt(f.amount)}</span>
                      <CopyButton value={f.amount} />
                    </span>
                  ) : (
                    <span className="shrink-0 text-right font-semibold">{f.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <a
        href="https://efiling.rd.go.th/"
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 font-semibold text-accent-ink shadow-md"
      >
        <Icon name="send" size={20} />
        {t('เปิดเว็บ e-Filing ของกรมสรรพากร', 'Open the Revenue Department e-Filing site')}
      </a>
      <p className="px-1 text-xs text-muted">
        {t(
          'ชื่อช่องในระบบ e-Filing อาจต่างจากที่แสดงเล็กน้อย และระบบอาจเติมข้อมูลบางส่วนให้เอง เช่น เงินเดือนจากนายจ้าง หรือเงินบริจาคผ่าน e-Donation',
          'Box names in e-Filing may differ slightly from these, and the system may fill some figures in for you, such as salary from your employer or e-Donation donations.',
        )}
      </p>

      <FiledCompare result={result} onFeedback={onFeedback} />
    </div>
  )
}
