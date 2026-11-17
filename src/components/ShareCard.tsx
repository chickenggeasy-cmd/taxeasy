import { useEffect, useState } from 'react'
import type { TaxResult, TaxRules } from '../engine/types'
import { useLang, useT } from '../lib/lang'
import { renderShareCard, shareOrDownload } from '../lib/shareCard'
import { Icon } from './icons'
import { Toggle } from './ui'

/** สร้างรูปสรุปภาษีไว้แชร์ เลือกซ่อนยอดเงินได้ */
export function ShareCard({ result, rules, onClose }: { result: TaxResult; rules: TaxRules; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const [hide, setHide] = useState(true)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<[string, string] | null>(null)

  useEffect(() => {
    let alive = true
    let made = ''
    setBlob(null)
    renderShareCard(result, rules, hide, lang)
      .then((b) => {
        if (!alive) return
        made = URL.createObjectURL(b)
        setBlob(b)
        setUrl(made)
      })
      .catch(() => alive && setStatus(['สร้างรูปไม่สำเร็จ', 'Could not create the image']))
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [result, rules, hide, lang])

  return (
    <section className="card anim-fade flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('แชร์ผลลัพธ์', 'Share your result')}</h2>
        <button type="button" onClick={onClose} className="rounded-xl px-2 py-1 text-sm font-semibold text-accent">
          {t('ปิด', 'Close')}
        </button>
      </div>
      <Toggle
        label={t('ซ่อนยอดเงิน', 'Hide amounts')}
        hint={t('แสดงแค่ว่าได้คืนหรือจ่ายเพิ่ม และอัตราภาษี', 'Show only whether you get a refund or owe, plus your tax rates')}
        checked={hide}
        onChange={setHide}
      />
      <div className="mx-auto aspect-[4/5] w-full max-w-72 overflow-hidden rounded-2xl border border-line bg-paper">
        {url && blob ? <img src={url} alt={t('ตัวอย่างรูปสรุปภาษีที่จะแชร์', 'Preview of the tax summary image')} className="anim-fade block h-full w-full" /> : <div className="h-full w-full animate-pulse" />}
      </div>
      <button
        type="button"
        disabled={!blob}
        onClick={async () => {
          if (!blob) return
          const r = await shareOrDownload(blob, `taxeasy-${rules.taxYear}.png`, lang)
          setStatus(r === 'shared' ? ['แชร์แล้ว', 'Shared'] : r === 'downloaded' ? ['บันทึกรูปแล้ว ดูได้ในโฟลเดอร์ดาวน์โหลด', 'Image saved to your Downloads folder'] : null)
        }}
        className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-ink shadow-md disabled:opacity-60"
      >
        <Icon name="share" size={20} />
        {t('แชร์ / บันทึกรูป', 'Share / save image')}
      </button>
      {status && (
        <p role="status" className="text-center text-sm text-muted">
          {t(status[0], status[1])}
        </p>
      )}
      <p className="text-xs text-muted">{t('รูปสร้างในเครื่องของคุณ ไม่มีการส่งข้อมูลไปที่ไหน', 'The image is made on your device; nothing is sent anywhere.')}</p>
    </section>
  )
}
