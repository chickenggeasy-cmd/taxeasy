// สร้างไฟล์ .ics เพิ่มวันครบกำหนดยื่นภาษีลงปฏิทินในมือถือ/คอม พร้อมแจ้งเตือนล่วงหน้า
import type { TaxRules } from '../engine/types'
import type { Lang } from './lang'

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

export function filingEvents(rules: TaxRules, lang: Lang = 'th'): CalendarEvent[] {
  const y = rules.taxYear
  const t = (th: string, en: string) => (lang === 'en' ? en : th)
  return [
    {
      id: `online-${y}`,
      date: rules.filingDeadlines.online,
      title: t(`วันสุดท้ายยื่นภาษีออนไลน์ ปีภาษี ${y}`, `Last day to file online, tax year ${y}`),
      description: t(
        `ยื่น ภ.ง.ด.90/91 ทาง e-Filing ของกรมสรรพากร (efiling.rd.go.th)\nเตรียมหนังสือรับรอง 50 ทวิ และหลักฐานค่าลดหย่อน\nคำนวณล่วงหน้าได้ในแอป ภาษีง่ายๆ`,
        `File P.N.D. 90/91 through the Revenue Department e-Filing site (efiling.rd.go.th)\nHave your 50 Tawi certificate and deduction evidence ready\nWork it out in advance with the TaxEasy app`,
      ),
    },
    {
      id: `paper-${y}`,
      date: rules.filingDeadlines.paper,
      title: t(`วันสุดท้ายยื่นภาษีแบบกระดาษ ปีภาษี ${y}`, `Last day to file on paper, tax year ${y}`),
      description: t('ยื่นแบบ ภ.ง.ด.90/91 ที่สำนักงานสรรพากรพื้นที่', 'File P.N.D. 90/91 at your local Revenue office'),
    },
    {
      id: `pnd94-${y}`,
      date: `${y}-09-30`,
      title: t(`ยื่น ภ.ง.ด.94 ภาษีครึ่งปี ${y}`, `File the half-year P.N.D. 94, ${y}`),
      description: t(
        'สำหรับเงินได้ 40(5)–40(8) ระหว่าง ม.ค.–มิ.ย. ถ้าไม่มีรายได้ประเภทนี้ ไม่ต้องยื่น',
        'For 40(5)–40(8) income from January to June. If you have none, you do not need to file.',
      ),
    },
  ]
}

export function buildIcs(events: CalendarEvent[], now = new Date(), lang: Lang = 'th'): string {
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
      ['-P7D', lang === 'en' ? 'In 7 days' : 'อีก 7 วัน'],
      ['-P1D', lang === 'en' ? 'Tomorrow' : 'พรุ่งนี้'],
    ]) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:${trigger}`, `DESCRIPTION:${esc(`${text}: ${e.title}`)}`, 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** เฉพาะกำหนดที่ยังไม่ผ่านไป */
export function upcomingEvents(rules: TaxRules, now = new Date(), lang: Lang = 'th'): CalendarEvent[] {
  const today = icsDate(`${now.getFullYear() + 543}-${now.getMonth() + 1}-${now.getDate()}`)
  return filingEvents(rules, lang).filter((e) => icsDate(e.date) >= today)
}

export function downloadIcs(rules: TaxRules, lang: Lang = 'th'): void {
  const events = upcomingEvents(rules, new Date(), lang)
  const blob = new Blob([buildIcs(events.length ? events : filingEvents(rules, lang), new Date(), lang)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `taxeasy-${rules.taxYear}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
