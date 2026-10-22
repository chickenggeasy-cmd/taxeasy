import { useEffect, useRef, useState } from 'react'
import type { TaxInput, TaxRules } from '../engine/types'
import { checkAssistant } from '../lib/assistant'
import { fmt } from '../lib/format'
import { scanForm, type ScanResult } from '../lib/scan'
import { Icon } from './icons'
import { MoneyField, Segmented } from './ui'

type Update = (fn: (draft: TaxInput) => void) => void
type Fields = Pick<ScanResult, 'salary' | 'withheld' | 'socialSecurity' | 'providentFund'>

/** ถ่ายรูป 50 ทวิ ให้ AI อ่านตัวเลข แล้วให้ผู้ใช้ตรวจก่อนใส่ */
export function ScanForm({ input, rules, update }: { input: TaxInput; rules: TaxRules; update: Update }) {
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [fields, setFields] = useState<Fields | null>(null)
  const [mode, setMode] = useState<'replace' | 'add'>('replace')
  const [done, setDone] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    checkAssistant().then((s) => alive && setAvailable(s === 'ready'))
    return () => {
      alive = false
    }
  }, [])

  if (!available) return null

  const pick = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    setError('')
    setDone(false)
    try {
      const r = await scanForm(f)
      if (!r.found) throw new Error(r.note || 'ไม่พบหนังสือรับรอง 50 ทวิ ในรูปนี้ ลองถ่ายให้เห็นทั้งใบและชัดขึ้น')
      setScan(r)
      setFields({ salary: r.salary, withheld: r.withheld, socialSecurity: r.socialSecurity, providentFund: r.providentFund })
      setMode(input.income.salary > 0 ? 'add' : 'replace')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  const apply = () => {
    if (!fields) return
    const add = mode === 'add'
    update((d) => {
      d.income.monthly.enabled = false
      d.income.salary = (add ? d.income.salary : 0) + fields.salary
      d.credits.withheld = (add ? d.credits.withheld : 0) + fields.withheld
      d.deductions.socialSecurity = (add ? d.deductions.socialSecurity : 0) + fields.socialSecurity
      d.deductions.pvd = (add ? d.deductions.pvd : 0) + fields.providentFund
    })
    setScan(null)
    setFields(null)
    setDone(true)
  }

  const set = (k: keyof Fields) => (v: number) => setFields((f) => (f ? { ...f, [k]: v } : f))

  return (
    <div className="flex flex-col gap-3">
      <input ref={file} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
      {!scan && (
        <button
          type="button"
          disabled={busy}
          onClick={() => file.current?.click()}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft px-4 py-3 font-semibold text-accent disabled:opacity-70"
        >
          {busy ? (
            <>
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              กำลังอ่านเอกสาร…
            </>
          ) : (
            <>
              <Icon name="camera" size={20} />
              สแกน 50 ทวิ ให้กรอกให้
            </>
          )}
        </button>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-due-soft px-4 py-3 text-sm text-due">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-2xl bg-refund-soft px-4 py-3 text-sm text-refund">
          ✓ ใส่ตัวเลขจาก 50 ทวิ แล้ว ประกันสังคมและ PVD อยู่ในแท็บลดหย่อน
        </p>
      )}

      {scan && fields && (
        <div className="anim-fade flex flex-col gap-3 rounded-2xl bg-paper p-4">
          <div>
            <p className="font-semibold">ตรวจตัวเลขก่อนใส่</p>
            <p className="text-sm text-muted">
              {scan.employer || 'ไม่ระบุนายจ้าง'}
              {scan.taxYear ? ` · ปีภาษี ${scan.taxYear}` : ''}
            </p>
          </div>
          {scan.taxYear && scan.taxYear !== rules.taxYear && (
            <p className="rounded-xl bg-due-soft px-3 py-2 text-sm text-due">
              เอกสารนี้เป็นของปีภาษี {scan.taxYear} แต่ตอนนี้กำลังคำนวณปี {rules.taxYear} เปลี่ยนปีได้ที่แท็บตั้งค่า
            </p>
          )}
          {scan.note && <p className="text-sm text-muted">หมายเหตุจาก AI: {scan.note}</p>}
          <MoneyField id="scan-salary" label="เงินได้ 40(1) ทั้งปี" value={fields.salary} onChange={set('salary')} />
          <MoneyField id="scan-withheld" label="ภาษีที่หักไว้" value={fields.withheld} onChange={set('withheld')} />
          <MoneyField id="scan-ss" label="เงินสมทบประกันสังคม" value={fields.socialSecurity} onChange={set('socialSecurity')} />
          <MoneyField id="scan-pvd" label="กองทุนสำรองเลี้ยงชีพ (PVD)" value={fields.providentFund} onChange={set('providentFund')} />
          {input.income.salary > 0 && (
            <div className="flex flex-col gap-1">
              <Segmented
                label="วิธีใส่"
                value={mode}
                options={[
                  { value: 'add', label: 'บวกเพิ่ม (มีหลายใบ)' },
                  { value: 'replace', label: 'แทนที่ของเดิม' },
                ]}
                onChange={setMode}
              />
              <p className="num text-xs text-muted">ตอนนี้กรอกเงินเดือนไว้ {fmt(input.income.salary)} บาท</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => (setScan(null), setFields(null))} className="rounded-2xl bg-surface px-4 py-3 font-semibold text-muted">
              ยกเลิก
            </button>
            <button type="button" onClick={apply} className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-ink shadow-md">
              ใส่ตัวเลขนี้
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted">รูปถูกส่งให้ AI อ่านแล้วทิ้ง ไม่เก็บไว้บนเซิร์ฟเวอร์ ตรวจตัวเลขกับเอกสารจริงทุกครั้ง</p>
    </div>
  )
}
