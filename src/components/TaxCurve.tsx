import { useEffect, useMemo, useRef, useState } from 'react'
import { marginalRate, progressiveTax } from '../engine/calculate'
import type { TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'

interface Point {
  net: number
  tax: number
}

const H = 230
const M = { top: 26, right: 16, bottom: 30, left: 46 }
const NICE_X = [600_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 8_000_000, 10_000_000, 20_000_000]

/** 150000 → "150K", 1500000 → "1.5M" */
const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`)

function niceTicks(max: number, count = 4): number[] {
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  // ปัดเส้นบนสุดขึ้น ให้กราฟไม่ล้นกรอบ
  for (let v = 0; v < max + step - 1e-6; v += step) out.push(v)
  return out
}

/** เส้นโค้งภาษีขั้นบันได: แกน X = เงินได้สุทธิ, แกน Y = ภาษี วาดตามสเกลจริง */
export function TaxCurve({ rules, current, scenario }: { rules: TaxRules; current: Point; scenario?: Point }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const maxNet = Math.max(current.net, scenario?.net ?? 0)
  const xMax = NICE_X.find((v) => v >= maxNet * 1.25) ?? Math.ceil((maxNet * 1.25) / 10_000_000) * 10_000_000
  const taxAt = (x: number) => progressiveTax(x, rules).tax
  const yTicks = niceTicks(Math.max(taxAt(xMax), 1000))
  const yMax = yTicks[yTicks.length - 1]

  const iw = width - M.left - M.right
  const ih = H - M.top - M.bottom
  const sx = (x: number) => M.left + (x / xMax) * iw
  const sy = (y: number) => M.top + ih - (y / yMax) * ih

  const path = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const x = (xMax * i) / 200
      pts.push(`${sx(x).toFixed(1)},${sy(taxAt(x)).toFixed(1)}`)
    }
    return pts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xMax, yMax, width, rules])

  // เส้นแบ่งขั้นบันไดที่อยู่ในช่วงกราฟ
  const bounds = rules.brackets.map((b) => b.upTo).filter((u): u is number => u !== null && u < xMax)
  const edges = [0, ...bounds, xMax]
  const xLabels: number[] = []
  for (const b of [...bounds, xMax]) if (!xLabels.length || sx(b) - sx(xLabels[xLabels.length - 1]) > 42) xLabels.push(b)

  const markers = [
    { key: 'now', label: 'ตอนนี้', p: current, color: 'var(--ink)' },
    ...(scenario && Math.abs(scenario.net - current.net) > xMax * 0.01 ? [{ key: 'if', label: 'ถ้า…', p: scenario, color: 'var(--accent)' }] : []),
  ]

  const onMove = (clientX: number) => {
    const rect = wrap.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((clientX - rect.left - M.left) / iw) * xMax
    setHover(Math.max(0, Math.min(xMax, Math.round(x / 1000) * 1000)))
  }
  const hx = hover ?? null

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrap} className="relative w-full select-none">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label={`กราฟภาษีตามเงินได้สุทธิ ตอนนี้เงินได้สุทธิ ${fmt(current.net)} บาท ภาษี ${fmt(current.tax)} บาท`}
          tabIndex={0}
          className="block touch-pan-y outline-none focus-visible:outline-2 focus-visible:outline-accent"
          onPointerMove={(e) => onMove(e.clientX)}
          onPointerDown={(e) => onMove(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const step = xMax / 50
            setHover((h) => Math.max(0, Math.min(xMax, (h ?? current.net) + (e.key === 'ArrowRight' ? step : -step))))
          }}
          onBlur={() => setHover(null)}
        >
          {/* แถบอัตราภาษีแต่ละขั้น */}
          {edges.slice(0, -1).map((from, i) => {
            const to = edges[i + 1]
            const rate = marginalRate(from, rules)
            const w = sx(to) - sx(from)
            return (
              <g key={from}>
                {i > 0 && <line x1={sx(from)} x2={sx(from)} y1={M.top} y2={M.top + ih} stroke="var(--line)" strokeWidth="1" />}
                {w > 26 && (
                  <text x={sx(from) + w / 2} y={M.top - 9} textAnchor="middle" fontSize="10" fill="var(--muted)">
                    {pct(rate)}
                  </text>
                )}
              </g>
            )
          })}
          {/* เส้นตารางแกน Y */}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + iw} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth="1" />
              <text x={M.left - 6} y={sy(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)" className="num">
                {compact(t)}
              </text>
            </g>
          ))}
          {xLabels.map((b) => (
            <text key={b} x={sx(b)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--muted)" className="num">
              {compact(b)}
            </text>
          ))}
          <polygon points={`${sx(0)},${sy(0)} ${path.join(' ')} ${sx(xMax)},${sy(0)}`} fill="var(--accent)" opacity="0.1" />
          <polyline points={path.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {markers.map((m, i) => {
            const cx = sx(Math.min(m.p.net, xMax))
            const cy = sy(Math.min(m.p.tax, yMax))
            const right = cx < M.left + iw - 60
            return (
              <g key={m.key}>
                <line x1={cx} x2={cx} y1={cy} y2={M.top + ih} stroke={m.color} strokeWidth="1" opacity="0.35" />
                <circle cx={cx} cy={cy} r="5.5" fill={m.color} stroke="var(--surface)" strokeWidth="2" />
                <text x={right ? cx + 9 : cx - 9} y={cy - 8 - i * 14} textAnchor={right ? 'start' : 'end'} fontSize="11" fontWeight="600" fill="var(--ink)">
                  {m.label}
                </text>
              </g>
            )
          })}

          {hx !== null && (
            <line x1={sx(hx)} x2={sx(hx)} y1={M.top} y2={M.top + ih} stroke="var(--muted)" strokeWidth="1" pointerEvents="none" />
          )}
          {hx !== null && <circle cx={sx(hx)} cy={sy(taxAt(hx))} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" pointerEvents="none" />}
        </svg>

        {hx !== null && (
          <div
            className="card pointer-events-none absolute top-1 z-10 rounded-xl px-3 py-2 text-xs"
            style={sx(hx) > width / 2 ? { right: width - sx(hx) + 10 } : { left: sx(hx) + 10 }}
          >
            <p className="num">
              เงินได้สุทธิ <b>{fmt(hx)}</b>
            </p>
            <p className="num">
              ภาษี <b>{fmt(taxAt(hx))}</b> · ฐาน {pct(marginalRate(hx, rules))}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span>แกนนอน: เงินได้สุทธิ (บาท) · แกนตั้ง: ภาษีทั้งปี (บาท)</span>
        <button type="button" onClick={() => setTable(!table)} className="shrink-0 font-semibold text-accent">
          {table ? 'ซ่อนตาราง' : 'ดูเป็นตาราง'}
        </button>
      </div>
      {table && (
        <div className="overflow-x-auto">
          <table className="num w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1 font-semibold">เงินได้สุทธิ</th>
                <th className="py-1 text-right font-semibold">ภาษี</th>
                <th className="py-1 text-right font-semibold">ฐาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...markers.map((m) => ({ x: m.p.net, label: m.label })), ...bounds.map((b) => ({ x: b, label: '' }))]
                .sort((a, b) => a.x - b.x)
                .map((r) => (
                  <tr key={`${r.x}-${r.label}`}>
                    <td className="py-1.5">
                      {fmt(r.x)} {r.label && <b className="font-sans">({r.label})</b>}
                    </td>
                    <td className="py-1.5 text-right">{fmt(taxAt(r.x))}</td>
                    <td className="py-1.5 text-right">{pct(marginalRate(r.x, rules))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
