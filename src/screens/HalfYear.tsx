import { IconTile } from '../components/icons'
import { MoneyField, PageHero } from '../components/ui'
import { calculateHalfYear } from '../engine/scenarios'
import type { TaxInput, TaxRules } from '../engine/types'
import { fmt } from '../lib/format'
import { useT } from '../lib/lang'

type Update = (fn: (draft: TaxInput) => void) => void

/** ภ.ง.ด.94: ภาษีครึ่งปีของเงินได้ 40(5)–40(8) ช่วง ม.ค.–มิ.ย. */
export function HalfYear({ input, update, rules, onBack }: { input: TaxInput; update: Update; rules: TaxRules; onBack: () => void }) {
  const t = useT()
  const h = input.halfYear
  const r = calculateHalfYear(input, rules)
  const set = (k: keyof TaxInput['halfYear']) => (v: number) => update((d) => void (d.halfYear[k] = v))
  const income = h.rent + h.professional + h.contract + h.business
  const mustFile = income > (input.profile.married ? 120_000 : 60_000)
  const i = input.income
  const annual = Object.values(i.rent).reduce((a, b) => a + b, 0) + i.professional.medical + i.professional.other + i.contract.amount + i.business.amount
  const limit = input.profile.married ? '120,000' : '60,000'

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        {t('← กลับ', '← Back')}
      </button>
      <PageHero
        art="income"
        title={t('ภาษีครึ่งปี ภ.ง.ด.94', 'Half-year tax (P.N.D. 94)')}
        subtitle={t(
          `เงินได้ 40(5)–40(8) ระหว่าง 1 ม.ค. – 30 มิ.ย. ${rules.taxYear} · ยื่นภายใน 30 ก.ย.`,
          `40(5)–40(8) income from 1 Jan to 30 Jun ${rules.taxYear} · file by 30 Sep`,
        )}
      />

      <section className="card flex flex-col gap-4 rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <IconTile name="business" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{t('เงินได้ครึ่งปีแรก', 'Income for the first half')}</h2>
            <p className="text-sm text-muted">{t('หักค่าใช้จ่ายแบบเหมาให้เอง', 'Flat-rate expenses are applied for you')}</p>
          </div>
        </div>
        <MoneyField id="h-rent" label={t('ค่าเช่าบ้าน/อาคาร 40(5)', 'House / building rent 40(5)')} value={h.rent} onChange={set('rent')} />
        <MoneyField id="h-prof" label={t('วิชาชีพอิสระ 40(6)', 'Liberal professions 40(6)')} value={h.professional} onChange={set('professional')} />
        <MoneyField id="h-contract" label={t('รับเหมา 40(7)', 'Contracting 40(7)')} value={h.contract} onChange={set('contract')} />
        <MoneyField id="h-business" label={t('ค้าขาย/ธุรกิจ/อื่น ๆ 40(8)', 'Trade / business / other 40(8)')} value={h.business} onChange={set('business')} />
      </section>

      <section className="card flex flex-col gap-4 rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <IconTile name="shield" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{t('ค่าลดหย่อนที่จ่ายช่วง ม.ค.–มิ.ย.', 'Deductions paid from Jan to Jun')}</h2>
            <p className="text-sm text-muted">
              {t(
                'ค่าลดหย่อนครอบครัวใช้จากแท็บลดหย่อน ทุกรายการหักได้กึ่งหนึ่งของเพดานทั้งปี',
                'Family allowances come from the Deductions tab. Every item is capped at half the full-year limit.',
              )}
            </p>
          </div>
        </div>
        <MoneyField id="h-life" label={t('เบี้ยประกันชีวิต', 'Life insurance premiums')} value={h.lifeInsurance} onChange={set('lifeInsurance')} />
        <MoneyField id="h-health" label={t('เบี้ยประกันสุขภาพ', 'Health insurance premiums')} value={h.healthInsurance} onChange={set('healthInsurance')} />
        <MoneyField id="h-rmf" label={t('กองทุน RMF', 'RMF fund')} value={h.rmf} onChange={set('rmf')} />
        <MoneyField id="h-esg" label={t('กองทุน ThaiESG', 'ThaiESG fund')} value={h.thaiEsg} onChange={set('thaiEsg')} />
        <MoneyField id="h-home" label={t('ดอกเบี้ยเงินกู้ซื้อบ้าน', 'Home loan interest')} value={h.homeLoanInterest} onChange={set('homeLoanInterest')} />
      </section>

      <section className="rounded-3xl bg-accent-soft p-5">
        <p className="text-sm font-semibold text-accent">{t('ภาษีครึ่งปีที่ต้องชำระ', 'Half-year tax to pay')}</p>
        <p className="num font-display text-4xl font-semibold text-accent">฿{fmt(r.tax)}</p>
        <div className="num mt-2 flex flex-col gap-0.5 text-sm">
          <span>
            {t(
              `เงินได้ ${fmt(r.totalIncome)} − ค่าใช้จ่าย ${fmt(r.totalExpense)} − ลดหย่อน ${fmt(r.totalDeductions)} = เงินได้สุทธิ ${fmt(r.netIncome)}`,
              `Income ${fmt(r.totalIncome)} − expenses ${fmt(r.totalExpense)} − deductions ${fmt(r.totalDeductions)} = net income ${fmt(r.netIncome)}`,
            )}
          </span>
          {r.minimumTax !== null && (
            <span>
              {t(`วิธี 0.5%: ${fmt(r.minimumTax)} บาท`, `0.5% method: ${fmt(r.minimumTax)} baht`)}
              {r.usedMinimumTax ? t(' (สูงกว่า จึงใช้วิธีนี้)', ' (higher, so this one applies)') : ''}
            </span>
          )}
        </div>
        {income > annual && (
          <p className="mt-2 rounded-xl bg-due-soft px-3 py-2 text-sm text-due">
            {t(
              `เงินได้ครึ่งปี (${fmt(income)}) มากกว่าเงินได้ 40(5)–40(8) ทั้งปีที่กรอกในแท็บรายได้ (${fmt(annual)}) อย่าลืมกรอกยอดทั้งปีด้วย`,
              `Half-year income (${fmt(income)}) is more than the full-year 40(5)–40(8) income in the Income tab (${fmt(annual)}). Remember to enter the full-year amounts too.`,
            )}
          </p>
        )}
        {!mustFile && income > 0 && (
          <p className="mt-2 text-sm">
            {t(`เงินได้ครึ่งปีไม่เกิน ${limit} บาท ไม่ต้องยื่น ภ.ง.ด.94`, `Half-year income is not over ${limit} baht, so you do not need to file P.N.D. 94`)}
          </p>
        )}
        {r.tax > 0 && (
          <button
            type="button"
            onClick={() => update((d) => void (d.credits.prepaid = r.tax))}
            className="mt-3 rounded-2xl bg-accent px-4 py-2.5 font-semibold text-accent-ink"
          >
            {input.credits.prepaid === r.tax ? t('✓ ใช้ยอดนี้แล้ว', '✓ Amount in use') : t('ใช้ยอดนี้เป็นภาษีที่จ่ายล่วงหน้า', 'Use this as tax prepaid')}
          </button>
        )}
      </section>
      <p className="px-1 text-xs text-muted">
        {t(
          'ภาษีที่จ่ายตอนยื่น ภ.ง.ด.94 นำไปหักตอนยื่น ภ.ง.ด.90 ปลายปีได้ ตัวเลขนี้เป็นการประมาณการ ใช้เกณฑ์ครึ่งหนึ่งของกฎทั้งปี',
          'Tax paid with P.N.D. 94 is credited when you file P.N.D. 90 at year end. This is an estimate using half of the full-year limits.',
        )}
      </p>
    </div>
  )
}
