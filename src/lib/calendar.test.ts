import { describe, expect, it } from 'vitest'
import rules2569 from '../../rules/2569.json'
import type { TaxRules } from '../engine/types'
import { buildIcs, filingEvents, upcomingEvents } from './calendar'

const rules = rules2569 as unknown as TaxRules

describe('ปฏิทิน .ics', () => {
  it('แปลง พ.ศ. เป็น ค.ศ. และมีแจ้งเตือน 7 วัน/1 วัน', () => {
    const ics = buildIcs(filingEvents(rules), new Date('2026-10-22T00:00:00Z'))
    const [y, m, d] = rules.filingDeadlines.online.split('-').map(Number)
    expect(ics).toContain(`DTSTART;VALUE=DATE:${y - 543}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(6)
    expect(ics).toContain('TRIGGER:-P7D')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
  })
  it('พับบรรทัดไม่เกิน 75 ไบต์', () => {
    const ics = buildIcs(filingEvents(rules))
    const enc = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75)
  })
  it('ตัดกำหนดที่ผ่านไปแล้วออก', () => {
    const all = filingEvents(rules)
    expect(upcomingEvents(rules, new Date(2000, 0, 1))).toHaveLength(all.length)
    expect(upcomingEvents(rules, new Date(2100, 0, 1))).toHaveLength(0)
  })
})
