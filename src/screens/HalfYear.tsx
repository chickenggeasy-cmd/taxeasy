import { IconTile } from '../components/icons'
import { MoneyField, PageHero } from '../components/ui'
import { calculateHalfYear } from '../engine/scenarios'
import type { TaxInput, TaxRules } from '../engine/types'
import { fmt } from '../lib/format'

type Update = (fn: (draft: TaxInput) => void) => void

/** ภ.ง.ด.94: ภาษีครึ่งปีของเงินได้ 40(5)–40(8) ช่วง ม.ค.–มิ.ย. */
export function HalfYear({ input, update, rules, onBack }: { input: TaxInput; update: Update; rules: TaxRules; onBack: () => void }) {
  const h = input.halfYear
  const r = calculateHalfYear(input, rules)
  const set = (k: keyof TaxInput['halfYear']) => (v: number) => update((d) => void (d.halfYear[k] = v))
  const income = h.rent + h.professional + h.contract + h.business
  const mustFile = income > (input.profile.married ? 120_000 : 60_000)
  const i = input.income
  const annual = Object.values(i.rent).reduce((a, b) => a + b, 0) + i.professional.medical + i.professional.other + i.contract.amount + i.business.amount

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        ← กลับ
      </button>
      <PageHero art="income" title="ภาษีครึ่งปี ภ.ง.ด.94" subtitle={`เงินได้ 40(5)–40(8) ระหว่าง 1 ม.ค. – 30 มิ.ย. ${rules.taxYear} · ยื่นภายใน 30 ก.ย.`} />

      <section className="card flex flex-col gap-4 rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <IconTile name="business" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">เงินได้ครึ่งปีแรก</h2>
            <p className="text-sm text-muted">หักค่าใช้จ่ายแบบเหมาให้เอง</p>
          </div>
        </div>
        <MoneyField id="h-rent" label="ค่าเช่าบ้าน/อาคาร 40(5)" value={h.rent} onChange={set('rent')} />
        <MoneyField id="h-prof" label="วิชาชีพอิสระ 40(6)" value={h.professional} onChange={set('professional')} />
        <MoneyField id="h-contract" label="รับเหมา 40(7)" value={h.contract} onChange={set('contract')} />
        <MoneyField id="h-business" label="ค้าขาย/ธุรกิจ/อื่น ๆ 40(8)" value={h.business} onChange={set('business')} />
      </section>

      <section className="card flex flex-col gap-4 rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <IconTile name="shield" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">ค่าลดหย่อนที่จ่ายช่วง ม.ค.–มิ.ย.</h2>
            <p className="text-sm text-muted">ค่าลดหย่อนครอบครัวใช้จากแท็บลดหย่อน ทุกรายการหักได้กึ่งหนึ่งของเพดานทั้งปี</p>
          </div>
        </div>
        <MoneyField id="h-life" label="เบี้ยประกันชีวิต" value={h.lifeInsurance} onChange={set('lifeInsurance')} />
        <MoneyField id="h-health" label="เบี้ยประกันสุขภาพ" value={h.healthInsurance} onChange={set('healthInsurance')} />
        <MoneyField id="h-rmf" label="กองทุน RMF" value={h.rmf} onChange={set('rmf')} />
        <MoneyField id="h-esg" label="กองทุน ThaiESG" value={h.thaiEsg} onChange={set('thaiEsg')} />
        <MoneyField id="h-home" label="ดอกเบี้ยเงินกู้ซื้อบ้าน" value={h.homeLoanInterest} onChange={set('homeLoanInterest')} />
      </section>

      <section className="rounded-3xl bg-accent-soft p-5">
        <p className="text-sm font-semibold text-accent">ภาษีครึ่งปีที่ต้องชำระ</p>
        <p className="num font-display text-4xl font-semibold text-accent">฿{fmt(r.tax)}</p>
        <div className="num mt-2 flex flex-col gap-0.5 text-sm">
          <span>
            เงินได้ {fmt(r.totalIncome)} − ค่าใช้จ่าย {fmt(r.totalExpense)} − ลดหย่อน {fmt(r.totalDeductions)} = เงินได้สุทธิ {fmt(r.netIncome)}
          </span>
          {r.minimumTax !== null && (
            <span>
              วิธี 0.5%: {fmt(r.minimumTax)} บาท{r.usedMinimumTax ? ' (สูงกว่า จึงใช้วิธีนี้)' : ''}
            </span>
          )}
        </div>
        {income > annual && (
          <p className="mt-2 rounded-xl bg-due-soft px-3 py-2 text-sm text-due">
            เงินได้ครึ่งปี ({fmt(income)}) มากกว่าเงินได้ 40(5)–40(8) ทั้งปีที่กรอกในแท็บรายได้ ({fmt(annual)}) อย่าลืมกรอกยอดทั้งปีด้วย
          </p>
        )}
        {!mustFile && income > 0 && <p className="mt-2 text-sm">เงินได้ครึ่งปีไม่เกิน {input.profile.married ? '120,000' : '60,000'} บาท ไม่ต้องยื่น ภ.ง.ด.94</p>}
        {r.tax > 0 && (
          <button
            type="button"
            onClick={() => update((d) => void (d.credits.prepaid = r.tax))}
            className="mt-3 rounded-2xl bg-accent px-4 py-2.5 font-semibold text-accent-ink"
          >
            {input.credits.prepaid === r.tax ? '✓ ใช้ยอดนี้แล้ว' : 'ใช้ยอดนี้เป็นภาษีที่จ่ายล่วงหน้า'}
          </button>
        )}
      </section>
      <p className="px-1 text-xs text-muted">
        ภาษีที่จ่ายตอนยื่น ภ.ง.ด.94 นำไปหักตอนยื่น ภ.ง.ด.90 ปลายปีได้ ตัวเลขนี้เป็นการประมาณการ ใช้เกณฑ์ครึ่งหนึ่งของกฎทั้งปี
      </p>
    </div>
  )
}
