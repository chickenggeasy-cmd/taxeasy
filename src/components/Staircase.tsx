import { useState } from 'react'
import type { TaxResult } from '../engine/types'
import { fmt, pct } from '../lib/format'

/** บันไดภาษี: แต่ละขั้นแสดงช่วงเงินได้ อัตรา และภาษีที่เกิดในขั้นนั้น */
export function Staircase({ result }: { result: TaxResult }) {
  const [all, setAll] = useState(false)
  const lines = result.brackets
  const current = lines.findIndex((l) => l.to === null || result.netIncome < l.to)
  const shown = all ? lines : lines.slice(0, Math.min(lines.length, Math.max(current + 2, 3)))

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-1.5">
        {shown.map((l, i) => {
          const size = l.to === null ? Math.max(l.taxable, 1) : l.to - l.from
          const fill = Math.min(1, l.taxable / size)
          const here = i === current
          return (
            <li
              key={l.from}
              className={`grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 ${here ? 'bg-accent-soft' : ''}`}
              style={{ marginLeft: `${i * 0.35}rem` }}
            >
              <span className={`num rounded-md px-1.5 py-0.5 text-center text-sm font-semibold ${here ? 'bg-accent text-accent-ink' : 'bg-paper text-muted'}`}>
                {pct(l.rate)}
              </span>
              <span className="min-w-0">
                <span className="num block truncate text-xs text-muted">
                  {fmt(l.from)} – {l.to === null ? 'ขึ้นไป' : fmt(l.to)}
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-paper">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${fill * 100}%` }} />
                </span>
              </span>
              <span className={`num text-right text-sm ${l.tax > 0 ? 'font-semibold' : 'text-muted'}`}>{fmt(l.tax)}</span>
            </li>
          )
        })}
      </ol>
      {lines.length > shown.length || all ? (
        <button type="button" className="self-start text-sm font-semibold text-accent" onClick={() => setAll(!all)}>
          {all ? 'ย่อขั้นบันได' : `ดูทั้ง ${lines.length} ขั้น`}
        </button>
      ) : null}
    </div>
  )
}
