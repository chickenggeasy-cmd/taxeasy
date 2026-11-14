import { useState } from 'react'
import { PageHero, Section } from '../components/ui'
import type { TaxRules } from '../engine/types'
import { dateText } from '../lib/format'
import { useLang, useT } from '../lib/lang'
import { downloadBackup, restoreBackup } from '../lib/backup'
import type { RulesState } from '../lib/rules'

const SOURCE_LABEL = {
  bundled: 'กฎที่ติดมากับแอป',
  cached: 'กฎที่บันทึกไว้ในเครื่อง',
  online: 'กฎล่าสุดจากหลังบ้าน',
} as const

export function More({
  rules,
  rulesState,
  years,
  year,
  onYear,
  onRefresh,
  refreshing,
  onReset,
  onExample,
  onFiling,
  onPrivacy,
  onFeedback,
  onReplayOnboarding,
}: {
  rules: TaxRules
  rulesState: RulesState
  years: number[]
  year: number
  onYear: (y: number) => void
  onRefresh: () => void
  refreshing: boolean
  onReset: () => void
  onExample: () => void
  onFiling: () => void
  onPrivacy: () => void
  onFeedback: () => void
  onReplayOnboarding: () => void
}) {
  const [confirmReset, setConfirmReset] = useState(false)
  const t = useT()
  const lang = useLang()
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null)

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <PageHero art="more" title="เพิ่มเติม" subtitle="ปีภาษี กฎที่ใช้คำนวณ และข้อมูลของคุณ" />
      <Section icon="calendar" title="ปีภาษี" subtitle="เงินได้ระหว่าง 1 ม.ค. – 31 ธ.ค. ของปีที่เลือก">
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => onYear(y)}
              aria-pressed={y === year}
              className={`num rounded-xl border px-4 py-2 font-semibold ${y === year ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}
            >
              {y}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          {lang === 'en'
            ? `Filing for tax year ${rules.taxYear}: online until ${dateText(rules.filingDeadlines.online, 'en')} · paper until ${dateText(rules.filingDeadlines.paper, 'en')}`
            : `ยื่นภาษีปี ${rules.taxYear}: ออนไลน์ถึง ${dateText(rules.filingDeadlines.online, 'th')} · กระดาษถึง ${dateText(rules.filingDeadlines.paper, 'th')}`}
        </p>
      </Section>

      <Section
        icon="rules"
        title="กฎภาษีที่ใช้อยู่"
        subtitle={`ปี ${rules.taxYear} ฉบับที่ ${rules.revision} · อัปเดต ${rules.updatedAt}`}
        action={
          <button type="button" onClick={onRefresh} disabled={refreshing} className="shrink-0 rounded-xl border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50">
            {refreshing ? 'กำลังตรวจ…' : 'ตรวจอัปเดต'}
          </button>
        }
      >
        <p className="text-sm">
          <span className="font-semibold">{SOURCE_LABEL[rulesState.source]}</span>
          {rulesState.checkedAt && <span className="text-muted"> · ตรวจล่าสุด {new Date(rulesState.checkedAt).toLocaleString('th-TH')}</span>}
        </p>
        {rulesState.error && <p className="rounded-xl bg-paper px-3 py-2 text-sm text-muted">{rulesState.error}</p>}
        {rules.notes && <p className="text-sm text-muted">{rules.notes}</p>}
        <ul className="flex flex-col gap-1 text-sm">
          {rules.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon="send" title="ยื่นภาษีจริง">
        <p className="text-[15px]">ดูทีละขั้นว่าต้องกรอกตัวเลขไหนในระบบ e-Filing พร้อมรายการเอกสารที่ต้องเตรียม</p>
        <button type="button" onClick={onFiling} className="rounded-2xl bg-accent px-4 py-3 text-center font-semibold text-accent-ink shadow-md">
          ดูวิธียื่นภาษีและเอกสาร
        </button>
      </Section>

      <Section icon="lock" title="ข้อมูลของคุณ" subtitle="ตัวเลขที่กรอกเก็บไว้ในเครื่องนี้ ไม่ถูกส่งขึ้นเซิร์ฟเวอร์">
        {!__PREVIEW__ && (
        <div className="flex flex-col gap-2 rounded-2xl bg-paper p-3">
          <p className="text-sm">
            <b>สำรองข้อมูล</b> <span className="text-muted">ย้ายไปเครื่องใหม่ หรือกันข้อมูลหายเมื่อล้างเบราว์เซอร์</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadBackup} className="rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink">
              บันทึกเป็นไฟล์
            </button>
            <label className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2 font-semibold">
              กู้คืนจากไฟล์
              <input
                id="restore-file"
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    const n = restoreBackup(await file.text())
                    setRestoreMsg({ ok: true, text: `กู้คืน ${n} รายการแล้ว กำลังโหลดใหม่…` })
                    setTimeout(() => window.location.reload(), 900)
                  } catch (err) {
                    setRestoreMsg({ ok: false, text: (err as Error).message })
                  }
                }}
              />
            </label>
          </div>
          {restoreMsg && <p className={`text-sm ${restoreMsg.ok ? 'text-refund' : 'text-due'}`}>{restoreMsg.text}</p>}
        </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onExample} className="rounded-xl border border-line px-4 py-2 font-semibold">
            ใส่ข้อมูลตัวอย่าง
          </button>
          {!confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)} className="rounded-xl border border-due px-4 py-2 font-semibold text-due">
              ล้างข้อมูลปี {year}
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm">ลบข้อมูลที่กรอกทั้งหมดของปี {year}?</span>
              <button
                type="button"
                onClick={() => {
                  onReset()
                  setConfirmReset(false)
                }}
                className="rounded-xl bg-due px-4 py-2 font-semibold text-surface"
              >
                ลบ
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="rounded-xl border border-line px-4 py-2 font-semibold">
                ยกเลิก
              </button>
            </span>
          )}
        </div>
      </Section>

      <Section icon="bulb" title={t('ช่วยเหลือ', 'Help')} subtitle={t('เจอปัญหา หรืออยากรู้ว่าข้อมูลถูกส่งไปไหน', 'Found a problem, or want to know where your data goes')}>
        <div className="flex flex-col divide-y divide-line">
          {[
            {
              label: t('ดูคำแนะนำการใช้งานอีกครั้ง', 'Show the quick guide again'),
              hint: t('4 หน้าสั้น ๆ ว่าแอปทำอะไรและเริ่มอย่างไร', 'Four short pages on what the app does and how to start'),
              onClick: onReplayOnboarding,
            },
            { label: t('แจ้งปัญหา / ข้อเสนอแนะ', 'Report a problem or suggestion'), hint: t('ตัวเลขไม่ตรง ใช้งานไม่ได้ หรืออยากให้เพิ่มอะไร', 'Numbers differ, something is broken, or you want a feature'), onClick: onFeedback },
            { label: t('นโยบายความเป็นส่วนตัว', 'Privacy policy'), hint: t('ข้อมูลอยู่ที่ไหน ส่งไปไหน และวิธีลบ', 'Where data is kept, where it goes, and how to delete it'), onClick: onPrivacy },
          ].map((r) => (
            <button key={r.label} type="button" onClick={r.onClick} className="flex items-center gap-3 py-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.label}</span>
                <span className="block text-sm text-muted">{r.hint}</span>
              </span>
              <span aria-hidden className="text-xl text-muted">
                →
              </span>
            </button>
          ))}
        </div>
      </Section>

      <p className="px-1 text-xs text-muted">
        ภาษีง่ายๆ (TaxEasy) เป็นเครื่องมือช่วยประมาณการภาษี ผลลัพธ์อาจต่างจากการคำนวณของกรมสรรพากรในกรณีพิเศษ โปรดตรวจสอบเงื่อนไขกับประกาศทางการก่อนยื่นจริง
      </p>
    </div>
  )
}
