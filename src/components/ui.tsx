import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { fmt } from '../lib/format'
import { Art, type ArtName } from './Art'
import { IconTile, type IconName } from './icons'

/** หัวหน้าแต่ละแท็บ: ชื่อหน้า + ภาพประกอบ (ถ้ามีไฟล์ใน images/) */
export function PageHero({ title, subtitle, art }: { title: string; subtitle?: string; art: ArtName }) {
  return (
    <div className="flex items-center gap-4 px-1 pt-1">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="num mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      <Art name={art} alt="" className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28" />
    </div>
  )
}

export function Section({ title, subtitle, children, action, icon }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <section className="card rounded-3xl">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <IconTile name={icon} />}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  )
}

const parse = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** ช่องกรอกจำนวนเงิน: แสดงคอมมา เปิดแป้นตัวเลขบนมือถือ */
export function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
  max,
  allowed,
  note,
}: {
  id: string
  label: string
  value: number
  onChange: (n: number) => void
  hint?: ReactNode
  /** แสดง "สูงสุด x บาท" */
  max?: number
  /** ยอดที่ใช้สิทธิได้จริง (ถ้าต่างจากที่กรอกจะแสดงเตือน) */
  allowed?: number
  note?: string
}) {
  const [text, setText] = useState(value ? fmt(value) : '')
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(value ? fmt(value) : '')
  }, [value, focused])

  const capped = allowed !== undefined && value > 0 && allowed < value
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      <div
        className={`flex items-center rounded-xl border bg-paper focus-within:border-accent ${capped ? 'border-due' : 'border-line'}`}
      >
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          className="num min-w-0 flex-1 bg-transparent px-3 py-3 text-right text-lg outline-none"
          value={text}
          onFocus={() => {
            setFocused(true)
            setText(value ? String(value) : '')
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setText(e.target.value)
            onChange(parse(e.target.value))
          }}
        />
        <span className="pr-3 text-muted">บาท</span>
      </div>
      {(hint || max !== undefined) && (
        <p className="text-sm text-muted">
          {hint}
          {hint && max !== undefined ? ' · ' : ''}
          {max !== undefined && <>สูงสุด {fmt(max)} บาท</>}
        </p>
      )}
      {capped && (
        <p className="text-sm text-due">
          ใช้สิทธิได้ {fmt(allowed!)} บาท{note ? ` — ${note}` : ''}
        </p>
      )}
      {!capped && note && value > 0 && <p className="text-sm text-muted">{note}</p>}
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}

export function Stepper({ label, value, onChange, max = 10, hint }: { label: string; value: number; onChange: (n: number) => void; max?: number; hint?: string }) {
  const btn = 'h-10 w-10 rounded-full border border-line text-xl leading-none disabled:opacity-30'
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" aria-label={`ลด ${label}`} className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="num w-6 text-center text-lg font-semibold">{value}</span>
        <button type="button" aria-label={`เพิ่ม ${label}`} className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col gap-1 rounded-xl bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${value === o.value ? 'bg-surface text-accent shadow-sm' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Disclosure({ title, summary, children, defaultOpen = false, icon }: { title: string; summary?: string; children: ReactNode; defaultOpen?: boolean; icon?: IconName }) {
  const [open, setOpen] = useState(defaultOpen)
  const body = useRef<HTMLDivElement>(null)
  // ตอนพับ: ห้ามโฟกัส/กดช่องที่ซ่อนอยู่
  useEffect(() => {
    if (body.current) body.current.inert = !open
  }, [open])
  return (
    <div className={`rounded-2xl border transition-colors duration-200 ${open ? 'border-accent/40 bg-paper/60' : 'border-line'}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left active:scale-100">
        <span className="flex min-w-0 items-center gap-3">
          {icon && <IconTile name={icon} size={36} />}
          <span className="min-w-0">
            <span className="block font-semibold">{title}</span>
            {summary && <span className="num block text-sm text-muted">{summary}</span>}
          </span>
        </span>
        <span aria-hidden className={`text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {/* กาง/พับแบบนุ่มด้วย grid-template-rows */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} ref={body}>
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-t border-line p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
