import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/lang'
import { readJSON, writeJSON } from '../lib/storage'
import { Art, type ArtName } from './Art'

export const ONBOARDING_KEY = 'taxeasy:onboarded'

/** เคยดูคำแนะนำแล้วหรือยัง (ผู้ใช้คนละเครื่องหรือเคลียร์ข้อมูลเว็บแล้วจะเห็นใหม่) */
export function hasOnboarded(): boolean {
  return readJSON<boolean>(ONBOARDING_KEY) === true
}

type SlideKind = 'welcome' | 'income' | 'deductions' | 'result'

/** ไฟล์ภาพใน images/ ของแต่ละหน้า (ถ้าหายไปจะใช้ภาพ SVG วาดเองแทน) */
const SLIDE_ART: Record<SlideKind, ArtName> = {
  welcome: 'onb-welcome',
  income: 'onb-income',
  deductions: 'onb-deductions',
  result: 'onb-result',
}

/** สีพื้นของภาพแต่ละหน้า ให้กรอบกลมกลืนกับขอบภาพ (ภาพเป็นพื้นอ่อนทั้งโหมดสว่างและมืด) */
const PANEL_BG: Record<SlideKind, string> = {
  welcome: '#edeffe',
  income: '#e6ebfd',
  deductions: '#eaedfe',
  result: '#e8ebfd',
}

const SLIDES: { kind: SlideKind; th: [string, string]; en: [string, string] }[] = [
  {
    kind: 'welcome',
    th: ['ยินดีต้อนรับสู่ภาษีง่ายๆ', 'แอปคำนวณภาษีเงินได้บุคคลธรรมดาให้คุณรู้ว่าปีนี้ได้คืนหรือต้องจ่ายเพิ่มเท่าไร ไม่ต้องสมัครสมาชิก ข้อมูลอยู่ในเครื่องคุณ'],
    en: [
      'Welcome to TaxEasy',
      'Find out whether you get a refund or owe tax this year. Thai personal income tax, estimated for you. No sign-up. Your data stays on this device.',
    ],
  },
  {
    kind: 'income',
    th: ['กรอกรายได้ของคุณ', 'ไปที่แท็บรายได้ กรอกเงินเดือนทั้งปีและภาษีที่ถูกหักไว้ตามใบ 50 ทวิ ใช้เวลาไม่ถึง 2 นาที ตอนนี้กำลังดูข้อมูลตัวอย่างอยู่'],
    en: [
      'Enter your income',
      'Open the Income tab and enter your annual salary and the tax withheld shown on your 50 Tawi certificate. It takes under 2 minutes. You are viewing sample data for now.',
    ],
  },
  {
    kind: 'deductions',
    th: ['ค่าลดหย่อนให้แอปคิดเอง', 'แอปหักค่าใช้จ่ายและตรวจเพดานลดหย่อนทุกรายการให้ ถ้ามีคู่สมรสหรือบุตร ใส่ได้ในแท็บลดหย่อน'],
    en: [
      'Deductions are calculated for you',
      'The app applies expense allowances and checks every deduction cap. Add a spouse or children in the Deductions tab.',
    ],
  },
  {
    kind: 'result',
    th: ['ดูผลและรู้ว่าต้องยื่นไหม', 'หน้าสรุปบอกยอดที่ได้คืนหรือต้องจ่ายเพิ่ม และบอกว่าต้องยื่นแบบหรือไม่ แม้ไม่ต้องเสียภาษี ลองวางแผนลดหย่อนได้ที่แท็บวางแผน'],
    en: [
      'See your result and whether to file',
      'The summary shows your refund or amount due, and whether you must file even when no tax is due. Plan your deductions in the Plan tab.',
    ],
  },
]

/** สีจากธีมของแอป จึงเปลี่ยนตามโหมดสว่าง/มืดและโหมดตาบอดสีอัตโนมัติ */
const fill = (name: string) => ({ style: { fill: `var(--${name})` } })
const card = { style: { fill: 'var(--surface)', stroke: 'var(--line)', strokeWidth: 1 } }
const outline = (name: string) => ({ style: { fill: 'var(--surface)', stroke: `var(--${name})`, strokeWidth: 1.5 } })
const rule = { style: { stroke: 'var(--line)' } }

/**
 * ภาพสอนใช้งาน วาดเลียนแบบหน้าจอจริงของแอป (ไม่ต้องมีไฟล์รูป ไม่โหลดอะไรเพิ่ม)
 * ข้อความในภาพเป็นตัวอย่างเดียวกับข้อมูลตัวอย่างในแอป
 */
function SlideArt({ kind }: { kind: SlideKind }) {
  const t = useT()
  const svgProps = { viewBox: '0 0 320 176', className: 'h-44 w-full', 'aria-hidden': true }

  if (kind === 'income') {
    return (
      <svg {...svgProps}>
        <rect x="30" y="12" width="260" height="114" rx="14" {...card} />
        <text x="46" y="32" fontSize="10.5" {...fill('muted')}>
          {t('เงินเดือนทั้งปี', 'Annual salary')}
        </text>
        <rect x="46" y="38" width="228" height="26" rx="8" {...outline('accent')} />
        <text x="262" y="56" textAnchor="end" fontSize="13" fontWeight="700" {...fill('ink')}>
          720,000
        </text>
        <text x="46" y="82" fontSize="10.5" {...fill('muted')}>
          {t('ภาษีที่ถูกหักไว้ (ใบ 50 ทวิ)', 'Tax withheld (50 Tawi)')}
        </text>
        <rect x="46" y="88" width="228" height="26" rx="8" {...outline('line')} />
        <text x="262" y="106" textAnchor="end" fontSize="13" fontWeight="700" {...fill('ink')}>
          26,000
        </text>
        <rect x="40" y="138" width="240" height="28" rx="14" {...card} />
        <rect x="90" y="142" width="44" height="20" rx="10" {...fill('accent-soft')} />
        <text x="112" y="156" textAnchor="middle" fontSize="9.5" fontWeight="700" {...fill('accent')}>
          {t('รายได้', 'Income')}
        </text>
        {[64, 160, 208, 256].map((x) => (
          <circle key={x} cx={x} cy="152" r="3" {...fill('muted')} />
        ))}
      </svg>
    )
  }

  if (kind === 'deductions') {
    return (
      <svg {...svgProps}>
        <rect x="30" y="10" width="260" height="156" rx="14" {...card} />
        <circle cx="54" cy="34" r="9" {...fill('accent-soft')} />
        <text x="70" y="38" fontSize="11" fontWeight="600" {...fill('ink')}>
          {t('ประกันชีวิต', 'Life insurance')}
        </text>
        <text x="274" y="38" textAnchor="end" fontSize="11" fontWeight="700" {...fill('ink')}>
          30,000
        </text>
        <rect x="70" y="46" width="204" height="5" rx="2.5" {...fill('line')} />
        <rect x="70" y="46" width="61" height="5" rx="2.5" {...fill('accent')} />
        <text x="70" y="62" fontSize="8.5" {...fill('muted')}>
          {t('เพดาน 100,000 บาท', 'Cap 100,000 baht')}
        </text>
        <line x1="50" x2="270" y1="72" y2="72" {...rule} />
        <circle cx="54" cy="90" r="9" {...fill('accent-soft')} />
        <text x="70" y="94" fontSize="11" fontWeight="600" {...fill('ink')}>
          {t('กองทุน RMF', 'RMF fund')}
        </text>
        <text x="274" y="94" textAnchor="end" fontSize="11" fontWeight="700" {...fill('ink')}>
          50,000
        </text>
        <rect x="70" y="102" width="204" height="5" rx="2.5" {...fill('line')} />
        <rect x="70" y="102" width="51" height="5" rx="2.5" {...fill('accent')} />
        <text x="70" y="118" fontSize="8.5" {...fill('muted')}>
          {t('ไม่เกิน 15% ของเงินได้', 'Up to 15% of income')}
        </text>
        <line x1="50" x2="270" y1="128" y2="128" {...rule} />
        <circle cx="54" cy="146" r="9" {...fill('refund')} />
        <path d="M49.5 146l3 3 6-6" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--surface)' }} />
        <text x="70" y="150" fontSize="11" fontWeight="600" {...fill('ink')}>
          {t('บุตร 1 คน', '1 child')}
        </text>
        <text x="274" y="150" textAnchor="end" fontSize="11" fontWeight="700" {...fill('ink')}>
          30,000
        </text>
      </svg>
    )
  }

  if (kind === 'result') {
    return (
      <svg {...svgProps}>
        <rect x="30" y="10" width="260" height="156" rx="14" {...card} />
        <text x="160" y="32" textAnchor="middle" fontSize="10" {...fill('muted')}>
          {t('ผลการคำนวณปี 2569', 'Result for tax year 2569')}
        </text>
        <text x="160" y="74" textAnchor="middle" fontSize="30" fontWeight="800" {...fill('refund')}>
          ฿7,550
        </text>
        <text x="160" y="92" textAnchor="middle" fontSize="11" {...fill('muted')}>
          {t('ได้คืนภาษี', 'Tax refund')}
        </text>
        <line x1="50" x2="270" y1="104" y2="104" {...rule} />
        <rect x="50" y="116" width="220" height="32" rx="16" {...fill('accent-soft')} />
        <circle cx="70" cy="132" r="8" {...fill('accent')} />
        <text x="70" y="136" textAnchor="middle" fontSize="11" fontWeight="800" {...fill('accent-ink')}>
          !
        </text>
        <text x="86" y="136" fontSize="10.5" fontWeight="700" {...fill('accent')}>
          {t('ต้องยื่นแบบ ภ.ง.ด.91', 'Must file P.N.D. 91')}
        </text>
      </svg>
    )
  }

  // หน้าแรก: โลโก้แอปและจุดเด่นสองข้อ
  return (
    <svg {...svgProps}>
      <rect x="118" y="14" width="84" height="84" rx="24" {...fill('accent')} />
      <rect x="134" y="62" width="14" height="22" rx="4" {...fill('accent-ink')} />
      <rect x="153" y="46" width="14" height="38" rx="4" {...fill('accent-ink')} />
      <rect x="172" y="30" width="14" height="54" rx="4" {...fill('accent-ink')} />
      <text x="160" y="126" textAnchor="middle" fontSize="18" fontWeight="700" {...fill('ink')}>
        {t('ภาษีง่ายๆ', 'TaxEasy')}
      </text>
      <rect x="24" y="138" width="132" height="24" rx="12" {...fill('accent-soft')} />
      <text x="90" y="154" textAnchor="middle" fontSize="10.5" fontWeight="600" {...fill('accent')}>
        {t('ไม่ต้องสมัครสมาชิก', 'No sign-up needed')}
      </text>
      <rect x="164" y="138" width="132" height="24" rx="12" {...fill('accent-soft')} />
      <text x="230" y="154" textAnchor="middle" fontSize="10.5" fontWeight="600" {...fill('accent')}>
        {t('ข้อมูลอยู่ในเครื่องคุณ', 'Data stays on device')}
      </text>
    </svg>
  )
}

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
          <div className="grid h-44 w-full place-items-center overflow-hidden rounded-3xl" style={{ background: PANEL_BG[slide.kind] }}>
            <Art name={SLIDE_ART[slide.kind]} alt="" className="h-44 w-full object-contain" fallback={<SlideArt kind={slide.kind} />} />
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
