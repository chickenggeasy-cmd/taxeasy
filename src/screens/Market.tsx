import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { IconTile } from '../components/icons'
import { PageHero, Segmented } from '../components/ui'
import { fetchMarket, type MarketData, type MarketItem, type MarketRange } from '../lib/market'

const RANGE_LABEL: Record<MarketRange, string> = { '1d': 'วันนี้', '1mo': '1 เดือน', '6mo': '6 เดือน', '1y': '1 ปี' }
const REFRESH_MS = 30_000
const num = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 2, minimumFractionDigits: v < 100 ? 2 : 0 })
const signed = (v: number | null, suffix = '') => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('th-TH', { maximumFractionDigits: 2 })}${suffix}`)

/** กราฟเส้นเล็ก วาดตามสเกลของข้อมูลจริง */
function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const rawId = useId()
  if (points.length < 2) return null
  const w = 120
  const h = 40
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - 3 - ((p - min) / span) * (h - 6)])
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const color = up ? 'var(--refund)' : 'var(--due)'
  const id = `spark${rawId.replace(/:/g, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="3" fill={color} />
    </svg>
  )
}

function MarketCard({ item, range }: { item: MarketItem; range: MarketRange }) {
  const dayUp = (item.changePct ?? 0) >= 0
  const rangeUp = (item.rangeChangePct ?? 0) >= 0
  // กะพริบเขียว/แดงเมื่อราคาเปลี่ยนจากรอบก่อน
  const prev = useRef(item.price)
  const [flash, setFlash] = useState<'' | 'flash-up' | 'flash-down'>('')
  useEffect(() => {
    if (item.price === prev.current) return
    setFlash(item.price > prev.current ? 'flash-up' : 'flash-down')
    prev.current = item.price
    const t = setTimeout(() => setFlash(''), 1000)
    return () => clearTimeout(t)
  }, [item.price])
  return (
    <li className={`card flex items-center gap-3 rounded-2xl p-3.5 ${flash}`}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{item.name}</p>
        <p className="truncate text-xs text-muted">{item.nameTh}</p>
        <p className="num mt-1 font-display text-xl font-semibold">{num(item.price)}</p>
        {item.changePct !== null && (
          <p className={`num text-sm font-semibold ${dayUp ? 'text-refund' : 'text-due'}`}>
            {dayUp ? '▲' : '▼'} {signed(item.change)} ({signed(item.changePct, '%')}) <span className="font-normal text-muted">วันนี้</span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Sparkline points={item.points} up={rangeUp} />
        <span className={`num text-xs font-semibold ${rangeUp ? 'text-refund' : 'text-due'}`}>
          {signed(item.rangeChangePct, '%')} {range === '1d' ? 'จากเปิดตลาด' : `ใน ${RANGE_LABEL[range]}`}
        </span>
      </div>
    </li>
  )
}

export function Market({ onBack }: { onBack: () => void }) {
  const [range, setRange] = useState<MarketRange>('1d')
  const [data, setData] = useState<MarketData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const current = useRef(range)
  current.current = range

  const load = useCallback(async (r: MarketRange, silent: boolean) => {
    if (!silent) setLoading(true)
    try {
      const d = await fetchMarket(r)
      if (current.current !== r) return
      setData(d)
      setError(null)
      setCheckedAt(new Date())
    } catch (e) {
      if (current.current === r) setError((e as Error).message)
    } finally {
      if (current.current === r) setLoading(false)
    }
  }, [])

  // โหลดเมื่อเปลี่ยนช่วงเวลา แล้วอัปเดตเองทุก 30 วินาที (หยุดเมื่อสลับไปแอปอื่น)
  useEffect(() => {
    void load(range, false)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(range, true)
    }, REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && void load(range, true)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [range, load])

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        ← กลับ
      </button>
      <PageHero art="plan" title="ตลาดหุ้นโลก" subtitle="ภาพรวมดัชนีหลัก ทองคำ และค่าเงินบาท ใช้ดูเท่านั้น" />

      <div className="flex items-center justify-between gap-3 px-1 text-sm">
        <span className="flex items-center gap-2 font-semibold text-refund">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-refund opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-refund" />
          </span>
          อัปเดตอัตโนมัติทุก 30 วินาที
        </span>
        <span className="num text-muted">{checkedAt ? `ล่าสุด ${checkedAt.toLocaleTimeString('th-TH')}` : loading ? 'กำลังโหลด…' : 'โหลดไม่สำเร็จ'}</span>
      </div>

      <Segmented label="ช่วงเวลา" value={range} options={(Object.keys(RANGE_LABEL) as MarketRange[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))} onChange={setRange} />

      {data?.sample && (
        <p className="rounded-2xl border border-dashed border-accent/60 bg-accent-soft/50 px-4 py-2.5 text-sm">
          <b className="text-accent">ข้อมูลตัวอย่าง</b> <span className="text-muted">ไม่ใช่ราคาจริง เปิดผ่านเซิร์ฟเวอร์ที่ติดตั้งหลังบ้านเพื่อดูข้อมูลจริง</span>
        </p>
      )}
      {data?.stale && <p className="rounded-2xl bg-due-soft px-4 py-2.5 text-sm text-due">ดึงข้อมูลใหม่ไม่ได้ กำลังแสดงข้อมูลล่าสุดที่บันทึกไว้</p>}
      {error && !data && <p className="rounded-2xl bg-due-soft px-4 py-3 text-sm text-due">{error}</p>}

      {loading && !data ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="card h-[104px] animate-pulse rounded-2xl" />
          ))}
        </ul>
      ) : (
        data && (
          <ul className={`grid gap-3 transition-opacity duration-200 sm:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((item) => (
              <MarketCard key={item.symbol} item={item} range={data.range} />
            ))}
          </ul>
        )
      )}

      {data && (
        <p className="px-1 text-xs text-muted">
          ข้อมูลจาก {data.source} · หุ้นไทยล่าช้าประมาณ 15 นาทีตามข้อกำหนดของตลาด ตลาดอื่นล่าช้าต่างกันไป · ไม่ใช่คำแนะนำการลงทุน
        </p>
      )}

      <section className="card rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-3">
          <IconTile name="rules" />
          <h2 className="text-lg font-semibold">หุ้นกับภาษี</h2>
        </div>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
          <li>
            <b>เงินปันผลหุ้นไทย</b> ถูกหักภาษี 10% เลือกนำมารวมคำนวณเพื่อขอเครดิตภาษีเงินปันผลได้ กรอกได้ที่แท็บรายได้
          </li>
          <li>
            <b>กำไรจากขายหุ้นไทยในตลาดหลักทรัพย์</b> ได้รับยกเว้นภาษีสำหรับบุคคลธรรมดา
          </li>
          <li>
            <b>หุ้นต่างประเทศ</b> เงินได้จากต่างประเทศที่นำเข้าไทยตั้งแต่ปี 2567 ต้องนำมาเสียภาษี
          </li>
          <li>
            <b>RMF และ ThaiESG</b> ลงทุนในหุ้นและใช้ลดหย่อนภาษีได้ ดูยอดที่ยังซื้อได้ที่แท็บวางแผน
          </li>
        </ul>
      </section>
    </div>
  )
}
