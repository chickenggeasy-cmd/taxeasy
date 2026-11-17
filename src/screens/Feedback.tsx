import { useState } from 'react'
import { IconTile } from '../components/icons'
import { Disclosure, PageHero, Toggle } from '../components/ui'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { buildContext } from '../lib/assistant'
import { FEEDBACK_CATEGORIES, FEEDBACK_MAX, sendFeedback, type FeedbackCategory } from '../lib/feedback'
import { useLang, useT } from '../lib/lang'
import { errorEn } from '../lib/server'

export function Feedback({
  input,
  result,
  rules,
  initialCategory,
  fromPage,
  onBack,
  onPrivacy,
}: {
  input: TaxInput
  result: TaxResult
  rules: TaxRules
  initialCategory: FeedbackCategory
  fromPage: string
  onBack: () => void
  onPrivacy: () => void
}) {
  const t = useT()
  const en = useLang() === 'en'
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory)
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  // แนบตัวเลขเป็นค่าเริ่มต้นเฉพาะเรื่องตัวเลขไม่ตรง จนกว่าผู้ใช้จะเลือกเอง
  const [attachChoice, setAttachChoice] = useState<boolean | null>(null)
  const attach = attachChoice ?? category === 'wrong_number'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ th: string; en: string } | null>(null)
  const [sent, setSent] = useState(false)
  const summary = buildContext(input, result, rules)
  const cat = FEEDBACK_CATEGORIES.find((c) => c.value === category)
  const hint = cat ? t(cat.hint, cat.hintEn) : ''

  if (sent) {
    return (
      <div className="anim-stagger flex flex-col gap-4">
        <section className="card flex flex-col items-center gap-3 rounded-3xl p-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-refund-soft text-2xl text-refund">✓</span>
          <h1 className="font-display text-xl font-semibold">{t('ส่งเรื่องแล้ว ขอบคุณครับ', 'Sent. Thank you!')}</h1>
          <p className="max-w-sm text-[15px] text-muted">
            {t('ทีมผู้ดูแลจะอ่านและแก้ไขให้เร็วที่สุด', 'The team will read it and fix things as soon as possible.')}
            {contact ? t(' ถ้ามีคำถามเพิ่มจะติดต่อกลับตามช่องทางที่ให้ไว้', ' If they have questions, they will contact you as you asked.') : ''}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setMessage('')
              }}
              className="rounded-2xl border border-line px-4 py-2.5 font-semibold"
            >
              {t('แจ้งเรื่องอื่น', 'Report something else')}
            </button>
            <button type="button" onClick={onBack} className="rounded-2xl bg-accent px-4 py-2.5 font-semibold text-accent-ink">
              {t('กลับ', 'Back')}
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        {t('← กลับ', '← Back')}
      </button>
      <PageHero
        art="more"
        title={t('แจ้งปัญหา', 'Report a problem')}
        subtitle={t('เจอตัวเลขผิด ใช้งานไม่ได้ หรืออยากให้เพิ่มอะไร บอกทีมได้เลย', 'Wrong numbers, something broken, or a feature you want? Tell the team.')}
      />

      {__PREVIEW__ ? (
        <p className="rounded-2xl bg-paper px-4 py-3 text-[15px]">
          {t('ลิงก์ทดลองนี้ไม่ได้เชื่อมหลังบ้าน ส่งเรื่องได้เมื่อเปิดแอปผ่านเซิร์ฟเวอร์ที่ติดตั้งไว้', 'This preview link has no backend. You can send reports when the app runs on a server with the backend installed.')}
        </p>
      ) : (
        <form
          className="card flex flex-col gap-4 rounded-3xl p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!message.trim()) return setError({ th: 'เขียนรายละเอียดก่อนส่ง', en: 'Write some details before sending' })
            setBusy(true)
            setError(null)
            try {
              await sendFeedback({
                category,
                message: message.trim(),
                contact: contact.trim(),
                taxYear: rules.taxYear,
                rulesRevision: rules.revision,
                page: fromPage,
                calcSummary: attach ? summary : '',
              })
              setSent(true)
            } catch (err) {
              setError({ th: (err as Error).message, en: errorEn(err) })
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="flex items-center gap-3">
            <IconTile name="send" />
            <h2 className="text-lg font-semibold">{t('เรื่องที่จะแจ้ง', 'What is it about?')}</h2>
          </div>

          <div role="radiogroup" aria-label={t('หัวข้อ', 'Topic')} className="flex flex-wrap gap-2">
            {FEEDBACK_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={category === c.value}
                onClick={() => setCategory(c.value)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${category === c.value ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted hover:text-ink'}`}
              >
                {t(c.label, c.labelEn)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fb-message" className="text-[15px] font-semibold">
              {t('รายละเอียด', 'Details')}
            </label>
            <textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, FEEDBACK_MAX))}
              rows={5}
              placeholder={
                category === 'wrong_number'
                  ? t('เช่น แอปบอกว่าได้คืน 7,550 บาท แต่ยื่นจริงได้คืน 6,800 บาท', 'e.g. the app says a 7,550 baht refund, but I actually got 6,800 baht')
                  : t('เล่าให้ฟังได้เลย', 'Tell us what happened')
              }
              className="w-full resize-y rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] focus:outline-2 focus:outline-accent"
            />
            <p className="flex justify-between gap-3 text-xs text-muted">
              <span>{hint}</span>
              <span className="num shrink-0">
                {message.length}/{FEEDBACK_MAX}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fb-contact" className="text-[15px] font-semibold">
              {t('ช่องทางติดต่อกลับ', 'How to contact you')} <span className="font-normal text-muted">{t('(ไม่ใส่ก็ได้)', '(optional)')}</span>
            </label>
            <input
              id="fb-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value.slice(0, 200))}
              placeholder={t('อีเมล หรือ LINE ID', 'Email or LINE ID')}
              autoComplete="email"
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] focus:outline-2 focus:outline-accent"
            />
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-paper p-3">
            <Toggle
              label={t('แนบตัวเลขที่คำนวณไว้', 'Attach my calculated figures')}
              hint={t('ช่วยให้ทีมหาจุดที่ผิดได้เร็วขึ้น ไม่มีชื่อหรือเลขบัตรประชาชน', 'Helps the team find the problem faster. No name or ID number is included.')}
              checked={attach}
              onChange={setAttachChoice}
            />
            {attach && (
              <Disclosure
                title={t('ดูข้อมูลที่จะส่ง', 'See what will be sent')}
                summary={t('สรุปรายได้ ค่าลดหย่อน และผลคำนวณ', 'Income, deductions and result summary (in Thai, for the support team)')}
              >
                <pre className="num max-h-64 overflow-auto rounded-xl bg-surface p-3 text-xs whitespace-pre-wrap">{summary}</pre>
              </Disclosure>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-due-soft px-4 py-3 text-sm text-due">
              {en ? error.en : error.th}
            </p>
          )}
          <button type="submit" disabled={busy} className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-ink shadow-md disabled:opacity-60">
            {busy ? t('กำลังส่ง…', 'Sending…') : t('ส่งเรื่อง', 'Send')}
          </button>
          <p className="text-xs text-muted">
            {t(
              'ข้อมูลที่ส่งเก็บในฐานข้อมูลของแอป ทีมผู้ดูแลอ่านได้ และลบอัตโนมัติเมื่อครบ 1 ปี',
              "What you send is stored in the app's database, readable by the team, and deleted automatically after 1 year.",
            )}{' '}
            <button type="button" onClick={onPrivacy} className="font-semibold text-accent underline">
              {t('อ่านนโยบายความเป็นส่วนตัว', 'Read the privacy policy')}
            </button>
          </p>
        </form>
      )}
    </div>
  )
}
