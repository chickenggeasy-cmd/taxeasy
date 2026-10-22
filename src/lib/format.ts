const baht = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2, minimumFractionDigits: 0 })

export const fmt = (n: number) => baht.format(Math.round(n * 100) / 100)
export const pct = (r: number) => `${(Math.round(r * 1000) / 10).toLocaleString('th-TH')}%`

/** "2569-03-31" (พ.ศ.) → "31 มี.ค. 2569" */
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export function thaiDate(be: string): string {
  const [y, m, d] = be.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** วันคงเหลือถึงวันที่ (พ.ศ.) */
export function daysUntil(be: string, now = new Date()): number {
  const [y, m, d] = be.split('-').map(Number)
  const target = new Date(y - 543, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** ปีภาษีที่คนส่วนใหญ่กำลังจะยื่น: ก่อน 9 เม.ย. ยังยื่นของปีที่แล้ว */
export function defaultTaxYear(now = new Date()): number {
  const be = now.getFullYear() + 543
  return now.getMonth() < 3 || (now.getMonth() === 3 && now.getDate() <= 8) ? be - 1 : be
}
