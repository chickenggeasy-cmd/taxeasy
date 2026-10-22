import { useEffect, useMemo, useState } from 'react'
import { calculateTax } from './engine/calculate'
import { emptyInput, mergeInput } from './engine/defaults'
import type { TaxInput, TaxRules } from './engine/types'
import { defaultTaxYear, fmt } from './lib/format'
import { fetchRules, initialRules, type RulesState } from './lib/rules'
import { readJSON, removeKey, writeJSON } from './lib/storage'
import { Deductions } from './screens/Deductions'
import { Income } from './screens/Income'
import { More } from './screens/More'
import { Plan } from './screens/Plan'
import { Summary, Verdict } from './screens/Summary'
import { Art } from './components/Art'
import { Assistant } from './components/Assistant'

type Tab = 'summary' | 'income' | 'deductions' | 'plan' | 'more'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'summary', label: 'สรุป', icon: 'M4 19V9m6 10V5m6 14v-7m4 7H2' },
  { id: 'income', label: 'รายได้', icon: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5M6 10v4m12-4v4' },
  { id: 'deductions', label: 'ลดหย่อน', icon: 'M6 18L18 6M8 8.5a1.5 1.5 0 100-.01M16 16.5a1.5 1.5 0 100-.01' },
  { id: 'plan', label: 'วางแผน', icon: 'M4 18l5-5 4 3 7-8m0 0h-5m5 0v5' },
  { id: 'more', label: 'ตั้งค่า', icon: 'M5 12h.01M12 12h.01M19 12h.01' },
]

const inputKey = (year: number) => `taxeasy:input:${year}`

function exampleInput(year: number, rules: TaxRules): TaxInput {
  const i = emptyInput()
  i.income.salary = 720_000
  i.credits.withheld = 26_000
  i.deductions.socialSecurity = rules.deductions.socialSecurity
  i.deductions.lifeInsurance = 30_000
  i.deductions.rmf = 50_000
  i.deductions.parents = 1
  i.deductions.children = [year - 6]
  return i
}

function pickYear(years: number[]): number {
  const saved = readJSON<number>('taxeasy:year')
  if (saved && years.includes(saved)) return saved
  const want = defaultTaxYear()
  return years.includes(want) ? want : years[years.length - 1]
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

export default function App() {
  const [rulesState, setRulesState] = useState<RulesState>(initialRules)
  const [refreshing, setRefreshing] = useState(false)
  const years = useMemo(() => Object.keys(rulesState.byYear).map(Number).sort(), [rulesState])
  const [year, setYear] = useState(() => pickYear(years))
  const rules = rulesState.byYear[year] ?? rulesState.byYear[years[years.length - 1]]

  const loadInput = (y: number) => {
    const saved = readJSON<TaxInput>(inputKey(y))
    return saved ? { input: mergeInput(saved), example: false } : { input: exampleInput(y, rulesState.byYear[y] ?? rules), example: true }
  }
  const [state, setState] = useState(() => loadInput(year))
  const [tab, setTab] = useState<Tab>(() => readJSON<Tab>('taxeasy:tab') ?? 'summary')

  const result = useMemo(() => calculateTax(state.input, rules), [state.input, rules])

  const refresh = async () => {
    setRefreshing(true)
    setRulesState(await fetchRules(rulesState))
    setRefreshing(false)
  }
  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => writeJSON('taxeasy:tab', tab), [tab])

  const update = (fn: (draft: TaxInput) => void) => {
    setState((s) => {
      const draft = structuredClone(s.input)
      fn(draft)
      writeJSON(inputKey(year), draft)
      return { input: draft, example: false }
    })
  }

  const changeYear = (y: number) => {
    setYear(y)
    writeJSON('taxeasy:year', y)
    setState(loadInput(y))
  }

  const startFresh = () => {
    const blank = emptyInput()
    writeJSON(inputKey(year), blank)
    setState({ input: blank, example: false })
    setTab('income')
  }

  const go = (t: Tab) => {
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  const screen = {
    summary: <Summary result={result} rules={rules} onStart={() => go('income')} />,
    income: <Income input={state.input} update={update} rules={rules} result={result} />,
    deductions: <Deductions input={state.input} update={update} rules={rules} result={result} />,
    plan: <Plan input={state.input} rules={rules} result={result} onAdd={() => go('deductions')} />,
    more: (
      <More
        rules={rules}
        rulesState={rulesState}
        years={years}
        year={year}
        onYear={changeYear}
        onRefresh={refresh}
        refreshing={refreshing}
        onReset={() => {
          removeKey(inputKey(year))
          startFresh()
        }}
        onExample={() => {
          removeKey(inputKey(year))
          setState({ input: exampleInput(year, rules), example: true })
          go('summary')
        }}
      />
    ),
  }[tab]

  const balanceText = result.balance < 0 ? `ได้คืน ฿${fmt(-result.balance)}` : result.balance > 0 ? `จ่ายเพิ่ม ฿${fmt(result.balance)}` : 'ไม่ต้องจ่ายเพิ่ม'
  const title = TABS.find((t) => t.id === tab)!.label

  return (
    <div className="min-h-full">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-paper/95 backdrop-blur before:fixed before:inset-x-0 before:top-0 before:h-[env(safe-area-inset-top,0px)] before:bg-paper">
        <div className="gutter mx-auto flex max-w-6xl items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent font-display text-lg font-semibold text-accent-ink">
              ภ
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-lg font-semibold">ภาษีง่ายๆ</p>
              <p className="text-xs text-muted md:hidden">{title}</p>
            </div>
          </div>
          <nav aria-label="เมนูหลัก" className="hidden gap-1 md:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => go(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`rounded-xl px-3 py-2 font-semibold ${tab === t.id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => go('more')} className="num shrink-0 rounded-full border border-line px-3 py-1.5 text-sm font-semibold">
            ปีภาษี {year}
          </button>
        </div>
      </header>

      <div className={`gutter mx-auto grid gap-6 pt-4 pb-40 md:pb-12 ${tab === 'summary' ? 'max-w-2xl' : 'max-w-6xl md:grid-cols-[minmax(0,1fr)_360px]'}`}>
        <main className="flex min-w-0 flex-col gap-4">
          {state.example && (
            <div className="overflow-hidden rounded-2xl border border-dashed border-accent">
              <Art name="hero" alt="" className="block h-auto max-h-56 w-full bg-art object-contain" />
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="min-w-0 text-[15px]">
                  <b>ตัวเลขนี้เป็นข้อมูลตัวอย่าง</b>
                  <span className="block text-sm text-muted">มนุษย์เงินเดือน 60,000 บาท/เดือน มีลูก 1 คน ดูแลแม่ 1 คน</span>
                </p>
                <button type="button" onClick={startFresh} className="shrink-0 rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink">
                  เริ่มกรอกของฉัน
                </button>
              </div>
            </div>
          )}
          {screen}
        </main>
        {tab !== 'summary' && (
          <aside className="hidden md:block">
            <div className="sticky top-24 flex flex-col gap-4">
              <Verdict result={result} />
              <button type="button" onClick={() => go('summary')} className="text-left text-sm font-semibold text-accent">
                ดูรายละเอียดการคำนวณ
              </button>
            </div>
          </aside>
        )}
      </div>

      <Assistant input={state.input} result={result} rules={rules} raised={tab !== 'summary'} />

      {/* แถบล่างบนมือถือ: ผลภาษีแบบสด + เมนู */}
      <div className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        {tab !== 'summary' && (
          <button
            type="button"
            onClick={() => go('summary')}
            className={`gutter num flex w-full items-center justify-between py-2.5 text-[15px] font-semibold ${
              result.balance < 0 ? 'bg-refund-soft text-refund' : result.balance > 0 ? 'bg-due-soft text-due' : 'bg-accent-soft text-accent'
            }`}
          >
            <span>{balanceText}</span>
            <span className="text-sm font-normal text-ink">ภาษีทั้งปี {fmt(result.tax)}</span>
          </button>
        )}
        <nav
          aria-label="เมนูหลัก"
          className="grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)]"
          style={{ paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-xs font-semibold ${tab === t.id ? 'text-accent' : 'text-muted'}`}
            >
              <Icon d={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
