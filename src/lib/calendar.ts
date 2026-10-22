// สร้างไฟล์ .ics เพิ่มวันครบกำหนดยื่นภาษีลงปฏิทินในมือถือ/คอม พร้อมแจ้งเตือนล่วงหน้า
import type { TaxRules } from '../engine/types'

export interface CalendarEvent {
  id: string
  /** วันที่ พ.ศ. "2570-04-08" */
  date: string
  title: string
  description: string
}

/** "2570-04-08" (พ.ศ.) → "20270408" (ค.ศ.) */
const icsDate = (be: string) => {
  const [y, m, d] = be.split('-').map(Number)
  return `${y - 543}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
}
const nextDay = (be: string) => {
  const [y, m, d] = be.split('-').map(Number)
  const t = new Date(Date.UTC(y - 543, m - 1, d + 1))
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}`
}
/** RFC 5545: escape \ ; , และขึ้นบรรทัดใหม่ */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** RFC 5545: บรรทัดยาวเกิน 75 ไบต์ต้องพับ (นับเป็น UTF-8 ไม่ตัดกลางตัวอักษร) */
function fold(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  for (const ch of line) {
    const limit = out.length ? 74 : 75
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur)
      cur = ch
    } else cur += ch
  }
  out.push(cur)
  return out.join('\r\n ')
}

export function filingEvents(rules: TaxRules): CalendarEvent[] {
  const y = rules.taxYear
  return [
    {
      id: `online-${y}`,
      date: rules.filingDeadlines.online,
      title: `วันสุดท้ายยื่นภาษีออนไลน์ ปีภาษี ${y}`,
      description: `ยื่น ภ.ง.ด.90/91 ทาง e-Filing ของกรมสรรพากร (efiling.rd.go.th)\nเตรียมหนังสือรับรอง 50 ทวิ และหลักฐานค่าลดหย่อน\nคำนวณล่วงหน้าได้ในแอป ภาษีง่ายๆ`,
    },
    {
      id: `paper-${y}`,
      date: rules.filingDeadlines.paper,
      title: `วันสุดท้ายยื่นภาษีแบบกระดาษ ปีภาษี ${y}`,
      description: 'ยื่นแบบ ภ.ง.ด.90/91 ที่สำนักงานสรรพากรพื้นที่',
    },
    {
      id: `pnd94-${y}`,
      date: `${y}-09-30`,
      title: `ยื่น ภ.ง.ด.94 ภาษีครึ่งปี ${y}`,
      description: 'สำหรับเงินได้ 40(5)–40(8) ระหว่าง ม.ค.–มิ.ย. ถ้าไม่มีรายได้ประเภทนี้ ไม่ต้องยื่น',
    },
  ]
}

export function buildIcs(events: CalendarEvent[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TaxEasy//ภาษีง่ายๆ//TH', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@taxeasy`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `DTEND;VALUE=DATE:${nextDay(e.date)}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.description)}`,
      'TRANSP:TRANSPARENT',
    )
    for (const [trigger, text] of [
      ['-P7D', 'อีก 7 วัน'],
      ['-P1D', 'พรุ่งนี้'],
    ]) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:${trigger}`, `DESCRIPTION:${esc(`${text}: ${e.title}`)}`, 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** เฉพาะกำหนดที่ยังไม่ผ่านไป */
export function upcomingEvents(rules: TaxRules, now = new Date()): CalendarEvent[] {
  const today = icsDate(`${now.getFullYear() + 543}-${now.getMonth() + 1}-${now.getDate()}`)
  return filingEvents(rules).filter((e) => icsDate(e.date) >= today)
}

export function downloadIcs(rules: TaxRules): void {
  const events = upcomingEvents(rules)
  const blob = new Blob([buildIcs(events.length ? events : filingEvents(rules))], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `taxeasy-${rules.taxYear}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
