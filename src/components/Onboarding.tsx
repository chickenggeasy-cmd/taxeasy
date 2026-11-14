import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/lang'
import { readJSON, writeJSON } from '../lib/storage'
import { Art, type ArtName } from './Art'

export const ONBOARDING_KEY = 'taxeasy:onboarded'

/** เคยดูคำแนะนำแล้วหรือยัง (ผู้ใช้คนละเครื่องหรือเคลียร์ข้อมูลเว็บแล้วจะเห็นใหม่) */
export function hasOnboarded(): boolean {
  return readJSON<boolean>(ONBOARDING_KEY) === true
}

const SLIDES: { art: ArtName; th: [string, string]; en: [string, string] }[] = [
  {
    art: 'hero',
    th: ['ยินดีต้อนรับสู่ภาษีง่ายๆ', 'แอปคำนวณภาษีเงินได้บุคคลธรรมดาให้คุณรู้ว่าปีนี้ได้คืนหรือต้องจ่ายเพิ่มเท่าไร ไม่ต้องสมัครสมาชิก ข้อมูลอยู่ในเครื่องคุณ'],
    en: [
      'Welcome to TaxEasy',
      'Find out whether you get a refund or owe tax this year. Thai personal income tax, estimated for you. No sign-up. Your data stays on this device.',
    ],
  },
  {
    art: 'income',
    th: ['กรอกรายได้ของคุณ', 'ไปที่แท็บรายได้ กรอกเงินเดือนทั้งปีและภาษีที่ถูกหักไว้ตามใบ 50 ทวิ ใช้เวลาไม่ถึง 2 นาที ตอนนี้กำลังดูข้อมูลตัวอย่างอยู่'],
    en: [
      'Enter your income',
      'Open the Income tab and enter your annual salary and the tax withheld shown on your 50 Tawi certificate. It takes under 2 minutes. You are viewing sample data for now.',
    ],
  },
  {
    art: 'deductions',
    th: ['ค่าลดหย่อนให้แอปคิดเอง', 'แอปหักค่าใช้จ่ายและตรวจเพดานลดหย่อนทุกรายการให้ ถ้ามีคู่สมรสหรือบุตร ใส่ได้ในแท็บลดหย่อน'],
    en: [
      'Deductions are calculated for you',
      'The app applies expense allowances and checks every deduction cap. Add a spouse or children in the Deductions tab.',
    ],
  },
  {
    art: 'refund',
    th: ['ดูผลและรู้ว่าต้องยื่นไหม', 'หน้าสรุปบอกยอดที่ได้คืนหรือต้องจ่ายเพิ่ม และบอกว่าต้องยื่นแบบหรือไม่ แม้ไม่ต้องเสียภาษี ลองวางแผนลดหย่อนได้ที่แท็บวางแผน'],
    en: [
      'See your result and whether to file',
      'The summary shows your refund or amount due, and whether you must file even when no tax is due. Plan your deductions in the Plan tab.',
    ],
  },
]

/** คำแนะนำการใช้งาน 4 หน้า เปิดอัตโนมัติตอนเข้าแอปครั้งแรก และเปิดซ้ำได้จากเมนูเพิ่มเติม */
export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [step, setStep] = useState(0)
  const next = useRef<HTMLButtonElement>(null)
  const last = step === SLIDES.length - 1
  const slide = SLIDES[step]

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    next.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, SLIDES.length - 1))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const finish = () => {
    writeJSON(ONBOARDING_KEY, true)
    onClose()
  }

  if (!open) return null
  const titleText = t(slide.th[0], slide.en[0])
  const bodyText = t(slide.th[1], slide.en[1])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={t('คำแนะนำการใช้งาน', 'How to use TaxEasy')}>
      <button type="button" aria-label={t('ปิด', 'Close')} className="anim-fade absolute inset-0 bg-ink/40" onClick={finish} />
      <div className="anim-sheet relative flex max-h-[92%] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-2xl md:rounded-3xl md:pb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">
            {step + 1} / {SLIDES.length}
          </p>
          <button type="button" onClick={finish} className="rounded-xl px-2 py-1 text-sm font-semibold text-accent">
            {t('ข้าม', 'Skip')}
          </button>
        </div>

        <div key={step} className="anim-fade flex flex-col items-center gap-4 pt-3 text-center">
          <div className="grid h-44 w-full place-items-center overflow-hidden rounded-3xl bg-accent-soft/60">
            <Art name={slide.art} alt="" className="h-full w-full object-contain p-2" />
          </div>
          <h2 className="font-display text-xl font-semibold">{titleText}</h2>
          <p className="text-[15px] leading-relaxed text-muted">{bodyText}</p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" role="group" aria-label={t('เลือกหน้า', 'Choose a page')}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t(`หน้าที่ ${i + 1}`, `Page ${i + 1}`)}
              aria-current={i === step}
              onClick={() => setStep(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${i === step ? 'w-7 bg-accent' : 'w-2.5 bg-line'}`}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="rounded-2xl border border-line px-4 py-3 font-semibold disabled:opacity-40"
          >
            {t('ย้อนกลับ', 'Back')}
          </button>
          <button
            ref={next}
            type="button"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-ink shadow-md"
          >
            {last ? t('เริ่มใช้งาน', 'Get started') : t('ถัดไป', 'Next')}
          </button>
        </div>
      </div>
    </div>
  )
}
