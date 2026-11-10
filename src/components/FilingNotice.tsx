import type { FilingRequirement } from '../lib/filing'
import { Icon } from './icons'

const TONE: Record<FilingRequirement['status'], { box: string; title: string; mark: string }> = {
  required: { box: 'bg-accent-soft', title: 'text-accent', mark: '!' },
  refund: { box: 'bg-refund-soft', title: 'text-refund', mark: '▲' },
  none: { box: 'card', title: 'text-ink', mark: '✓' },
}

/** บอกว่าต้องยื่นแบบหรือไม่ พร้อมเหตุผล (คนที่ไม่ต้องเสียภาษีก็อาจต้องยื่น) */
export function FilingNotice({ filing, onFiling }: { filing: FilingRequirement; onFiling?: () => void }) {
  const tone = TONE[filing.status]
  return (
    <section className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${tone.box}`}>
      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface ${tone.title}`}>
        <Icon name="receipt" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1.5 font-semibold ${tone.title}`}>
          <span aria-hidden className="text-xs">
            {tone.mark}
          </span>
          {filing.title}
        </p>
        <p className="num text-sm">{filing.reason}</p>
        {onFiling && filing.status !== 'none' && (
          <button type="button" onClick={onFiling} className="mt-1 text-sm font-semibold text-accent">
            ดูขั้นตอนยื่นแบบ →
          </button>
        )}
      </div>
    </section>
  )
}
