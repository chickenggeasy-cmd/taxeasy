import { readApiJson } from './server'

export type MarketRange = '1d' | '1mo' | '6mo' | '1y'

export interface MarketItem {
  symbol: string
  name: string
  nameTh: string
  region: string
  price: number
  change: number | null
  changePct: number | null
  rangeChangePct: number | null
  currency: string | null
  points: number[]
  marketTime: string | null
}

export interface MarketData {
  range: MarketRange
  source: string
  updatedAt: string
  items: MarketItem[]
  stale?: boolean
  /** true = ข้อมูลตัวอย่าง (ไม่ได้ต่อเซิร์ฟเวอร์) */
  sample?: boolean
}

export async function fetchMarket(range: MarketRange): Promise<MarketData> {
  if (__PREVIEW__) return sampleMarket(range)
  const res = await fetch(`./api/market.php?range=${range}`, { cache: 'no-store' })
  const data = await readApiJson<Partial<MarketData> & { ok?: boolean; error?: string }>(res)
  if (!res.ok || !data.ok || !data.items?.length) throw new Error(data.error ?? 'ดึงข้อมูลตลาดไม่ได้')
  return data as MarketData
}

const SAMPLE: [string, string, string, string, number][] = [
  ['^SET.BK', 'SET', 'ตลาดหุ้นไทย', 'TH', 1430],
  ['^GSPC', 'S&P 500', 'สหรัฐอเมริกา', 'US', 6650],
  ['^IXIC', 'Nasdaq', 'สหรัฐอเมริกา (เทคโนโลยี)', 'US', 22400],
  ['^N225', 'Nikkei 225', 'ญี่ปุ่น', 'JP', 45200],
  ['^HSI', 'Hang Seng', 'ฮ่องกง', 'HK', 26100],
  ['GC=F', 'Gold', 'ทองคำ (ดอลลาร์/ออนซ์)', 'XX', 3950],
  ['THB=X', 'USD/THB', 'ค่าเงินบาท (บาทต่อดอลลาร์)', 'TH', 32.6],
]

/** ข้อมูลตัวอย่างสำหรับลิงก์ทดลอง (สุ่มแบบคงที่ ไม่ใช่ราคาจริง) */
export function sampleMarket(range: MarketRange): MarketData {
  const n = range === '1d' ? 78 : range === '1mo' ? 22 : range === '6mo' ? 126 : 52
  // ขยับราคาเล็กน้อยตามเวลา ให้เห็นการอัปเดตอัตโนมัติในลิงก์ทดลอง
  const tick = Math.floor(Date.now() / 30000)
  const items = SAMPLE.map(([symbol, name, nameTh, region, base], k) => {
    let seed = k * 9301 + n * 49297
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.48) * 0.018
    const points: number[] = []
    let v = base * 0.94
    for (let i = 0; i < n; i++) points.push(Math.round((v *= 1 + rand()) * 100) / 100)
    points[n - 1] = Math.round(points[n - 1] * (1 + Math.sin(tick + k) * 0.002) * 100) / 100
    const price = points[n - 1]
    const prev = points[n - 2]
    return {
      symbol, name, nameTh, region, price, points,
      change: Math.round((price - prev) * 100) / 100,
      changePct: Math.round((price / prev - 1) * 10000) / 100,
      rangeChangePct: Math.round((price / points[0] - 1) * 10000) / 100,
      currency: null,
      marketTime: null,
    }
  })
  return { range, source: 'ข้อมูลตัวอย่าง', updatedAt: new Date().toISOString(), items, sample: true }
}
