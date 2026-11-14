import { useEffect, useState } from 'react'
import { setLang, useLang, useT, type Lang } from '../lib/lang'
import { loadSettings, saveSettings, type ColorVisionSetting, type DisplaySettings as Settings, type ThemeSetting } from '../lib/settings'
import { Segmented } from './ui'

const THEMES: { value: ThemeSetting; label: [string, string] }[] = [
  { value: 'system', label: ['ตามเครื่อง', 'Auto'] },
  { value: 'light', label: ['สว่าง', 'Light'] },
  { value: 'dark', label: ['มืด', 'Dark'] },
]

const VISION: { value: ColorVisionSetting; label: [string, string]; hint: [string, string] }[] = [
  {
    value: 'none',
    label: ['สีปกติ', 'Standard colors'],
    hint: ['ได้คืนเป็นสีเขียว จ่ายเพิ่มเป็นสีส้มอิฐ', 'Refund in green, amount due in brick orange'],
  },
  {
    value: 'rg',
    label: ['ตาบอดสีแดง-เขียว', 'Red-green color blindness'],
    hint: [
      'แยกสีแดงกับเขียวไม่ออก (พบบ่อยที่สุด) ใช้สีฟ้าคู่กับสีเหลืองอำพันแทน',
      'Most common. Uses blue and amber instead of red and green',
    ],
  },
  {
    value: 'by',
    label: ['ตาบอดสีน้ำเงิน-เหลือง', 'Blue-yellow color blindness'],
    hint: [
      'แยกสีน้ำเงินกับเหลืองไม่ออก ใช้สีเขียวหัวเป็ดคู่กับสีชมพูเข้มแทน',
      'Uses teal and deep pink instead of blue and yellow',
    ],
  },
]

const LANGS: { value: Lang; label: string }[] = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'English' },
]

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

/** ปุ่มลอยตั้งค่าการแสดงผล วางเหนือปุ่มน้องภาษี */
export function DisplaySettings({ raised }: { raised: boolean }) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const t = useT()
  const lang = useLang()

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('ตั้งค่าการแสดงผล', 'Display settings')}
        className={`fixed z-30 grid h-11 w-11 place-items-center rounded-full bg-surface text-muted shadow-lg ring-1 ring-line transition-transform hover:-translate-y-0.5 hover:text-ink md:bottom-[88px] ${
          open ? 'hidden' : ''
        } ${raised ? 'bottom-[calc(184px+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(142px+env(safe-area-inset-bottom,0px))]'}`}
        style={{ right: 'max(22px, calc(env(safe-area-inset-right, 0px) + 22px))' }}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-end md:items-stretch" role="dialog" aria-modal="true" aria-label={t('ตั้งค่าการแสดงผล', 'Display settings')}>
          <button type="button" aria-label={t('ปิด', 'Close')} className="anim-fade absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="anim-sheet relative flex max-h-[88%] w-full flex-col overflow-y-auto rounded-t-3xl bg-surface shadow-2xl md:h-full md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-line">
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                <GearIcon />
              </span>
              <p className="min-w-0 flex-1 font-display text-lg font-semibold">{t('ตั้งค่าการแสดงผล', 'Display settings')}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('ปิดหน้าตั้งค่า', 'Close settings')} className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg">
                ✕
              </button>
            </header>

            <div className="flex flex-col gap-6 px-4 pt-4 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
              <section className="flex flex-col gap-2">
                <h2 className="text-base font-semibold">{t('ภาษา', 'Language')}</h2>
                <Segmented label={t('ภาษา', 'Language')} value={lang} options={LANGS} onChange={(l) => setLang(l)} />
                <p className="text-sm text-muted">{t('เปลี่ยนภาษาของหน้าจอทันที ตัวเลขและข้อมูลที่กรอกไม่เปลี่ยน', 'Changes the screen language at once. Your numbers stay the same.')}</p>
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-base font-semibold">{t('ธีม', 'Theme')}</h2>
                <Segmented label={t('ธีม', 'Theme')} value={settings.theme} options={THEMES.map((o) => ({ value: o.value, label: t(...o.label) }))} onChange={(theme) => update({ theme })} />
                <p className="text-sm text-muted">{t('“ตามเครื่อง” จะสลับสว่าง/มืดตามที่ตั้งไว้ในมือถือหรือคอม', '“Auto” follows the light or dark setting of your phone or computer.')}</p>
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-base font-semibold">{t('สำหรับคนตาบอดสี', 'For color vision differences')}</h2>
                <div role="radiogroup" aria-label={t('สำหรับคนตาบอดสี', 'For color vision differences')} className="flex flex-col gap-2">
                  {VISION.map((v) => {
                    const on = settings.colorVision === v.value
                    return (
                      <button
                        key={v.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => update({ colorVision: v.value })}
                        className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left ${on ? 'border-accent bg-accent-soft' : 'border-line'}`}
                      >
                        <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-accent' : 'border-muted'}`}>
                          {on && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{t(...v.label)}</span>
                          <span className="block text-sm text-muted">{t(...v.hint)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-base font-semibold">{t('ตัวอย่างสี', 'Color preview')}</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-refund-soft p-3 text-refund">
                    <p className="text-xs font-semibold">▲ {t('ได้คืน', 'Refund')}</p>
                    <p className="num font-display text-xl font-semibold">฿7,550</p>
                  </div>
                  <div className="rounded-xl bg-due-soft p-3 text-due">
                    <p className="text-xs font-semibold">▼ {t('จ่ายเพิ่ม', 'Amount due')}</p>
                    <p className="num font-display text-xl font-semibold">฿2,300</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
