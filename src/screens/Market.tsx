import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { IconTile } from '../components/icons'
import { PageHero, Segmented } from '../components/ui'
import { useLang, useT } from '../lib/lang'
import { fetchMarket, type MarketData, type MarketItem, type MarketRange } from '../lib/market'
import { errorEn } from '../lib/server'

const RANGE_LABEL: Record<MarketRange, [string, string]> = {
  '1d': ['วันนี้', 'Today'],
  '1mo': ['1 เดือน', '1 month'],
  '6mo': ['6 เดือน', '6 months'],
  '1y': ['1 ปี', '1 year'],
}
const REFRESH_MS = 30_000

/** คำอธิบายภาษาอังกฤษของแต่ละการ์ด (nameTh มาจากหลังบ้านเป็นภาษาไทย) */
const NAME_EN: Record<string, string> = {
  '^SET.BK': 'Thailand',
  '^GSPC': 'United States',
  '^IXIC': 'United States (tech)',
  '^N225': 'Japan',
  '^HSI': 'Hong Kong',
  'GC=F': 'Gold (US dollars per ounce)',
  'THB=X': 'Thai baht (baht per US dollar)',
}

/** หน่วยของตัวเลขแต่ละการ์ด: ดัชนีเป็น "จุด" */
function unitOf(item: MarketItem): [string, string] {
  if (item.symbol === 'GC=F') return ['ดอลลาร์ต่อออนซ์', 'USD per ounce']
  if (item.symbol === 'THB=X') return ['บาทต่อ 1 ดอลลาร์', 'baht per 1 USD']
  return ['จุด', 'points']
}
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
  const t = useT()
  const en = useLang() === 'en'
  const dayUp = (item.changePct ?? 0) >= 0
  const rangeUp = (item.rangeChangePct ?? 0) >= 0
  // กะพริบเขียว/แดงเมื่อราคาเปลี่ยนจากรอบก่อน
  const prev = useRef(item.price)
  const [flash, setFlash] = useState<'' | 'flash-up' | 'flash-down'>('')
  useEffect(() => {
    if (item.price === prev.current) return
    setFlash(item.price > prev.current ? 'flash-up' : 'flash-down')
    prev.current = item.price
    const timer = setTimeout(() => setFlash(''), 1000)
    return () => clearTimeout(timer)
  }, [item.price])
  const subtitle = en ? (NAME_EN[item.symbol] ?? '') : item.nameTh
  return (
    <li className={`card flex items-center gap-3 rounded-2xl p-3.5 ${flash}`}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{item.name}</p>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        <p className="num mt-1 font-display text-xl font-semibold">
          {num(item.price)} <span className="font-body text-xs font-normal text-muted">{t(...unitOf(item))}</span>
        </p>
        {item.changePct !== null && (
          <p className={`num text-sm font-semibold ${dayUp ? 'text-refund' : 'text-due'}`}>
            {dayUp ? '▲' : '▼'} {signed(item.change)} ({signed(item.changePct, '%')}) <span className="font-normal text-muted">{t('วันนี้', 'today')}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Sparkline points={item.points} up={range === '1d' ? dayUp : rangeUp} />
        {range !== '1d' && (
          <span className={`num text-xs font-semibold ${rangeUp ? 'text-refund' : 'text-due'}`}>
            {signed(item.rangeChangePct, '%')} {t('ใน', 'over')} {t(...RANGE_LABEL[range])}
          </span>
        )}
      </div>
    </li>
  )
}

export function Market({ onBack }: { onBack: () => void }) {
  const t = useT()
  const en = useLang() === 'en'
  const [range, setRange] = useState<MarketRange>('1d')
  const [data, setData] = useState<MarketData | null>(null)
  const [error, setError] = useState<{ th: string; en: string } | null>(null)
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
      if (current.current === r) setError({ th: (e as Error).message, en: errorEn(e) })
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

  const source = data ? (data.sample ? t('ข้อมูลตัวอย่าง', 'sample data') : data.source) : ''

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        {t('← กลับ', '← Back')}
      </button>
      <PageHero
        art="plan"
        title={t('ตลาดหุ้นโลก', 'World markets')}
        subtitle={t('ภาพรวมดัชนีหลัก ทองคำ และค่าเงินบาท ใช้ดูเท่านั้น', 'Major indices, gold and the baht at a glance. For information only.')}
      />

      <div className="flex items-center justify-between gap-3 px-1 text-sm">
        <span className="flex items-center gap-2 font-semibold text-refund">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-refund opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-refund" />
          </span>
          {t('อัปเดตอัตโนมัติทุก 30 วินาที', 'Updates every 30 seconds')}
        </span>
        <span className="num text-muted">
          {checkedAt
            ? t(`ล่าสุด ${checkedAt.toLocaleTimeString('th-TH')}`, `Last ${checkedAt.toLocaleTimeString('en-GB')}`)
            : loading
              ? t('กำลังโหลด…', 'Loading…')
              : t('โหลดไม่สำเร็จ', 'Could not load')}
        </span>
      </div>

      <Segmented
        label={t('ช่วงเวลา', 'Time range')}
        value={range}
        options={(Object.keys(RANGE_LABEL) as MarketRange[]).map((r) => ({ value: r, label: t(...RANGE_LABEL[r]) }))}
        onChange={setRange}
      />

      {data?.sample && (
        <p className="rounded-2xl border border-dashed border-accent/60 bg-accent-soft/50 px-4 py-2.5 text-sm">
          <b className="text-accent">{t('ข้อมูลตัวอย่าง', 'Sample data')}</b>{' '}
          <span className="text-muted">
            {t('ไม่ใช่ราคาจริง เปิดผ่านเซิร์ฟเวอร์ที่ติดตั้งหลังบ้านเพื่อดูข้อมูลจริง', 'Not real prices. Open the app on a server with the backend installed to see live data.')}
          </span>
        </p>
      )}
      {data?.stale && (
        <p className="rounded-2xl bg-due-soft px-4 py-2.5 text-sm text-due">
          {t('ดึงข้อมูลใหม่ไม่ได้ กำลังแสดงข้อมูลล่าสุดที่บันทึกไว้', 'Could not fetch new data, so the last saved figures are shown.')}
        </p>
      )}
      {error && !data && <p className="rounded-2xl bg-due-soft px-4 py-3 text-sm text-due">{t(error.th, error.en)}</p>}

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
          {t(
            `ข้อมูลจาก ${source} · หุ้นไทยล่าช้าประมาณ 15 นาทีตามข้อกำหนดของตลาด ตลาดอื่นล่าช้าต่างกันไป · ไม่ใช่คำแนะนำการลงทุน`,
            `Data from ${source} · Thai shares are delayed about 15 minutes by exchange rules; other markets vary · not investment advice`,
          )}
        </p>
      )}

      <section className="card rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-3">
          <IconTile name="bulb" />
          <h2 className="text-lg font-semibold">{t('อ่านตัวเลขยังไง', 'How to read the numbers')}</h2>
        </div>
        {en ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
            <li>
              An <b>index</b> sums up the prices of many shares in one number. Its unit is “points”, not baht or dollars. The S&P 500, for example, covers 500 large US
              companies.
            </li>
            <li>
              Each index starts from a different base, so you cannot compare them by points. <b>Look at the % change</b> instead.
            </li>
            <li>
              <b>▲ +44.6 (+0.58%) today</b> means up 44.6 points, or 0.58%, from the previous trading day’s close.
            </li>
            <li>
              <b>Thai baht</b>: the higher the number, the weaker the baht (more baht are needed for 1 dollar).
            </li>
          </ul>
        ) : (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
            <li>
              <b>ดัชนี</b> คือตัวเลขสรุปภาพรวมราคาหุ้นหลายตัวรวมกัน หน่วยเป็น “จุด” ไม่ใช่บาทหรือดอลลาร์ เช่น S&P 500 รวมหุ้นบริษัทใหญ่ 500 แห่งของสหรัฐฯ
            </li>
            <li>
              แต่ละดัชนีเริ่มนับจากฐานไม่เท่ากัน จึงเทียบกันด้วยตัวเลขจุดไม่ได้ <b>ให้ดู % การเปลี่ยนแปลง</b>
            </li>
            <li>
              <b>▲ +44.6 (+0.58%) วันนี้</b> แปลว่าเพิ่มขึ้น 44.6 จุด หรือ 0.58% จากราคาปิดของวันทำการก่อนหน้า
            </li>
            <li>
              <b>ค่าเงินบาท</b> ตัวเลขยิ่งสูง บาทยิ่งอ่อน (ต้องใช้เงินบาทมากขึ้นแลก 1 ดอลลาร์)
            </li>
          </ul>
        )}
      </section>

      <section className="card rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-3">
          <IconTile name="rules" />
          <h2 className="text-lg font-semibold">{t('หุ้นกับภาษี', 'Shares and tax')}</h2>
        </div>
        {en ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
            <li>
              <b>Thai share dividends</b> have 10% tax withheld. You can include them in the calculation to claim the dividend tax credit, in the Income tab.
            </li>
            <li>
              <b>Gains from selling Thai shares on the stock exchange</b> are tax-exempt for individuals.
            </li>
            <li>
              <b>Foreign shares</b>: foreign income brought into Thailand from 2567 (2024) is taxable.
            </li>
            <li>
              <b>RMF and ThaiESG</b> invest in shares and are tax-deductible. See how much more you can buy in the Plan tab.
            </li>
          </ul>
        ) : (
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
        )}
      </section>
    </div>
  )
}
