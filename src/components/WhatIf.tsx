import { useState } from 'react'
import { calculateTax, progressiveTax } from '../engine/calculate'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt } from '../lib/format'
import { IconTile } from './icons'
import { TaxCurve } from './TaxCurve'

function Slider({ id, label, value, min, max, step, display, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-semibold">
          {label}
        </label>
        <span className="num font-display text-lg font-semibold text-accent">{display}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="range w-full" />
    </div>
  )
}

/** ลองเปลี่ยนตัวเลข แล้วดูว่าภาษีเปลี่ยนไปเท่าไร */
export function WhatIf({ input, rules, result }: { input: TaxInput; rules: TaxRules; result: TaxResult }) {
  const [salaryPct, setSalaryPct] = useState(0)
  const [extraIncome, setExtraIncome] = useState(0)
  const [extraDeduction, setExtraDeduction] = useState(0)

  const s: TaxInput = {
    ...input,
    income: { ...input.income, salary: Math.round(input.income.salary * (1 + salaryPct / 100)), freelance: input.income.freelance + extraIncome },
  }
  const r = calculateTax(s, rules)
  const net = Math.max(0, r.netIncome - extraDeduction)
  const tax = Math.max(progressiveTax(net, rules).tax, r.minimumTax ?? 0)
  const diff = tax - result.tax
  const incomeDiff = r.totalIncome - result.totalIncome
  const changed = salaryPct !== 0 || extraIncome !== 0 || extraDeduction !== 0

  return (
    <section className="card flex flex-col gap-4 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <IconTile name="saving" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">ลองดูว่า “ถ้า…”</h2>
          <p className="text-sm text-muted">เลื่อนแถบแล้วดูภาษีเปลี่ยนทันที ไม่กระทบข้อมูลที่กรอกไว้</p>
        </div>
        {changed && (
          <button
            type="button"
            onClick={() => {
              setSalaryPct(0)
              setExtraIncome(0)
              setExtraDeduction(0)
            }}
            className="shrink-0 rounded-xl px-2 py-1 text-sm font-semibold text-accent"
          >
            รีเซ็ต
          </button>
        )}
      </div>

      {input.income.salary > 0 && (
        <Slider id="wi-salary" label="เงินเดือนเปลี่ยน" value={salaryPct} min={-30} max={100} step={5} display={`${salaryPct > 0 ? '+' : ''}${salaryPct}%`} onChange={setSalaryPct} />
      )}
      <Slider id="wi-income" label="มีงานเสริมเพิ่ม (40(2))" value={extraIncome} min={0} max={1_000_000} step={10_000} display={`+${fmt(extraIncome)}`} onChange={setExtraIncome} />
      <Slider id="wi-deduction" label="ลดหย่อนเพิ่ม" value={extraDeduction} min={0} max={500_000} step={5_000} display={`+${fmt(extraDeduction)}`} onChange={setExtraDeduction} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-paper p-3">
          <p className="text-xs text-muted">ภาษีตอนนี้</p>
          <p className="num font-display text-2xl font-semibold">{fmt(result.tax)}</p>
        </div>
        <div className={`rounded-2xl p-3 ${!changed ? 'bg-paper' : diff > 0 ? 'bg-due-soft text-due' : 'bg-refund-soft text-refund'}`}>
          <p className="text-xs">ถ้า…</p>
          <p className="num font-display text-2xl font-semibold">{fmt(tax)}</p>
          {changed && (
            <p className="num text-xs font-semibold">
              {diff > 0 ? '▲' : diff < 0 ? '▼' : '●'} {diff > 0 ? '+' : ''}
              {fmt(diff)}
            </p>
          )}
        </div>
      </div>
      {incomeDiff > 0 && (
        <p className="num text-sm">
          รายได้เพิ่ม {fmt(incomeDiff)} บาท เสียภาษีเพิ่ม {fmt(Math.max(0, diff))} บาท · <b>เหลือเข้ากระเป๋า {fmt(incomeDiff - Math.max(0, diff))} บาท</b>
        </p>
      )}

      <TaxCurve rules={rules} current={{ net: result.netIncome, tax: result.tax }} scenario={changed ? { net, tax } : undefined} />
    </section>
  )
}
