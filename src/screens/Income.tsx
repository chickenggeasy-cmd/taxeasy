import { ScanForm } from '../components/ScanForm'
import { Disclosure, MoneyField, PageHero, Section, Segmented, Toggle } from '../components/ui'
import { compareDividendChoice } from '../engine/plan'
import { socialSecurityFromSalary, suggestedMonthlyWithholding } from '../engine/scenarios'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'
import { useLang, useT } from '../lib/lang'

type Update = (fn: (draft: TaxInput) => void) => void

export function Income({
  input,
  update,
  rules,
  result,
  onHalfYear,
  onPrivacy,
}: {
  input: TaxInput
  update: Update
  rules: TaxRules
  result: TaxResult
  onHalfYear: () => void
  onPrivacy: () => void
}) {
  const t = useT()
  const en = useLang() === 'en'
  const inc = input.income
  const ex = rules.expenses
  const expenseOf = (id: string) => result.incomes.find((l) => l.id === id)?.expense ?? 0
  const sumRent = Object.values(inc.rent).reduce((a, b) => a + b, 0)
  const inv = inc.investment
  const dividendChoice = compareDividendChoice(input, rules)
  const mo = inc.monthly
  const fx = inc.foreign
  // โหมดรายเดือน: แปลงเป็นยอดทั้งปีทุกครั้งที่แก้
  const setMonthly = (patch: Partial<typeof mo>) =>
    update((d) => {
      const m = { ...d.income.monthly, ...patch }
      d.income.monthly = m
      if (m.enabled) {
        d.income.salary = m.salary * 12 + m.bonus
        d.credits.withheld = m.withheld * 12
      }
    })
  const otherCredits = result.credits - input.credits.withheld
  const suggested = suggestedMonthlyWithholding(result, otherCredits)
  const balanceText = (b: number) =>
    b < 0 ? t(`ได้คืน ${fmt(-b)}`, `refund ${fmt(-b)}`) : b > 0 ? t(`จ่ายเพิ่ม ${fmt(b)}`, `pay ${fmt(b)} more`) : t('ไม่ต้องจ่ายเพิ่ม', 'nothing more to pay')
  const baht = (n: number) => t(`${fmt(n)} บาท`, `${fmt(n)} baht`)
  const none = t('ไม่มี', 'None')

  const rentKinds = [
    ['building', 'บ้าน อาคาร สิ่งปลูกสร้าง', 'Houses, buildings, structures'],
    ['agriLand', 'ที่ดินเกษตรกรรม', 'Agricultural land'],
    ['otherLand', 'ที่ดินอื่น', 'Other land'],
    ['vehicle', 'ยานพาหนะ', 'Vehicles'],
    ['other', 'ทรัพย์สินอื่น', 'Other property'],
  ] as const

  const businessKinds = [
    ['contract', 'รับเหมา 40(7)', 'Contracting 40(7)', 'ค่ารับเหมาที่ผู้รับเหมาจัดหาสัมภาระเอง', 'Contract work where you supply the materials', ex.contract.rate],
    [
      'business',
      'ค้าขาย / ธุรกิจ / อื่น ๆ 40(8)',
      'Trade / business / other 40(8)',
      'ขายของออนไลน์ รับจ้างผลิต เงินได้อื่นที่ไม่เข้าประเภทข้างบน',
      'Online selling, manufacturing for hire, and other income not listed above',
      ex.business.rate,
    ],
  ] as const

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <PageHero
        art="income"
        title={t('รายได้ทั้งปี', 'Annual income')}
        subtitle={t('กรอกเฉพาะประเภทที่คุณมี แอปหักค่าใช้จ่ายตามกฎหมายให้เอง', 'Fill in only the types you have. The app applies the legal expense deductions for you.')}
      />
      <Section
        icon="salary"
        title={t('เงินเดือน', 'Salary')}
        subtitle={
          mo.enabled
            ? t('กรอกยอดต่อเดือน แอปคาดการณ์ทั้งปีให้', 'Enter monthly amounts and the app projects the full year')
            : t('ดูยอดได้จากหนังสือรับรอง 50 ทวิ ที่บริษัทออกให้', 'Find the amounts on the 50 Tawi certificate from your employer')
        }
      >
        {!__PREVIEW__ && <ScanForm input={input} rules={rules} update={update} onPrivacy={onPrivacy} />}
        <Segmented
          label={t('วิธีกรอกเงินเดือน', 'How to enter salary')}
          value={mo.enabled ? 'monthly' : 'annual'}
          options={[
            { value: 'annual', label: t('ยอดทั้งปี', 'Annual total') },
            { value: 'monthly', label: t('รายเดือน', 'Monthly') },
          ]}
          onChange={(v) =>
            setMonthly(
              v === 'monthly'
                ? { enabled: true, salary: mo.salary || Math.round(inc.salary / 12), withheld: mo.withheld || Math.round(input.credits.withheld / 12) }
                : { enabled: false },
            )
          }
        />
        {mo.enabled ? (
          <>
            <MoneyField id="m-salary" label={t('เงินเดือนต่อเดือน', 'Monthly salary')} value={mo.salary} onChange={(v) => setMonthly({ salary: v })} />
            <MoneyField id="m-bonus" label={t('โบนัสทั้งปี (ถ้ามี)', 'Annual bonus (if any)')} value={mo.bonus} onChange={(v) => setMonthly({ bonus: v })} />
            <MoneyField
              id="m-withheld"
              label={t('ภาษีที่ถูกหักต่อเดือน', 'Tax withheld per month')}
              value={mo.withheld}
              onChange={(v) => setMonthly({ withheld: v })}
              hint={t('ดูในสลิปเงินเดือน', 'Shown on your payslip')}
            />
            <div className="rounded-2xl bg-paper p-3 text-sm">
              <p className="num">
                {t('คาดการณ์ทั้งปี: เงินเดือน + โบนัส', 'Full-year projection: salary + bonus')} <b>{fmt(inc.salary)}</b> {t('บาท · ถูกหักภาษี', 'baht · tax withheld')}{' '}
                <b>{fmt(input.credits.withheld)}</b> {t('บาท', 'baht')}
              </p>
              {result.tax > 0 && (
                <p className={`num mt-1 ${mo.withheld < suggested * 0.9 ? 'text-due' : 'text-refund'}`}>
                  {mo.withheld < suggested * 0.9
                    ? t(
                        `บริษัทควรหักประมาณเดือนละ ${fmt(suggested)} บาท ถ้าหักเท่าเดิม สิ้นปีอาจต้องจ่ายเพิ่ม`,
                        `Your employer should withhold about ${fmt(suggested)} baht a month. At the current rate you may owe tax at year end.`,
                      )
                    : t(`ภาษีที่ถูกหักต่อเดือนเหมาะสมแล้ว (ควรหักประมาณ ${fmt(suggested)} บาท)`, `Monthly withholding looks right (about ${fmt(suggested)} baht is suggested).`)}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <MoneyField
              id="salary"
              label={t('เงินเดือน + โบนัส ทั้งปี 40(1)', 'Salary + bonus for the year, 40(1)')}
              value={inc.salary}
              onChange={(v) => update((d) => void (d.income.salary = v))}
              hint={t(
                `หักค่าใช้จ่ายได้ ${pct(ex.employment.rate)} ไม่เกิน ${fmt(ex.employment.max)} บาท (รวมกับ 40(2))`,
                `Expense deduction ${pct(ex.employment.rate)}, up to ${fmt(ex.employment.max)} baht (shared with 40(2))`,
              )}
            />
            <MoneyField
              id="withheld"
              label={t('ภาษีที่ถูกหัก ณ ที่จ่ายทั้งปี', 'Tax withheld for the year')}
              value={input.credits.withheld}
              onChange={(v) => update((d) => void (d.credits.withheld = v))}
              hint={t('รวมทุกใบ 50 ทวิ ทั้งจากงานประจำและงานฟรีแลนซ์', 'Add up every 50 Tawi certificate, from both your job and freelance work')}
            />
          </>
        )}
        {inc.salary > 0 && input.deductions.socialSecurity === 0 && (
          <button
            type="button"
            onClick={() => update((d) => void (d.deductions.socialSecurity = socialSecurityFromSalary(mo.enabled ? mo.salary : inc.salary / 12, rules)))}
            className="self-start rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent"
          >
            {t(
              `คำนวณเงินสมทบประกันสังคมให้ (${fmt(socialSecurityFromSalary(mo.enabled ? mo.salary : inc.salary / 12, rules))} บาท/ปี)`,
              `Work out my social security contribution (${fmt(socialSecurityFromSalary(mo.enabled ? mo.salary : inc.salary / 12, rules))} baht/year)`,
            )}
          </button>
        )}
      </Section>

      <Section icon="coins" title={t('รายได้อื่น', 'Other income')} subtitle={t('เปิดเฉพาะประเภทที่คุณมี', 'Open only the types you have')}>
        <Disclosure icon="freelance" title={t('ฟรีแลนซ์ / ค่านายหน้า 40(2)', 'Freelance / commission 40(2)')} summary={inc.freelance ? baht(inc.freelance) : none}>
          <MoneyField
            id="freelance"
            label={t('ค่าจ้างงานฟรีแลนซ์ ค่านายหน้า ค่าเบี้ยประชุม', 'Freelance fees, commissions, meeting allowances')}
            value={inc.freelance}
            onChange={(v) => update((d) => void (d.income.freelance = v))}
            hint={t('ใช้เพดานหักค่าใช้จ่ายร่วมกับเงินเดือน', 'Shares the expense deduction cap with salary')}
          />
        </Disclosure>

        <Disclosure icon="royalty" title={t('ค่าลิขสิทธิ์ 40(3)', 'Royalties 40(3)')} summary={inc.royalty ? baht(inc.royalty) : none}>
          <MoneyField
            id="royalty"
            label={t('ค่าลิขสิทธิ์ / ค่าสิทธิ', 'Royalties / licence fees')}
            value={inc.royalty}
            onChange={(v) => update((d) => void (d.income.royalty = v))}
            hint={t(`หักค่าใช้จ่าย ${pct(ex.royalty.rate)} ไม่เกิน ${fmt(ex.royalty.max)} บาท`, `Expense deduction ${pct(ex.royalty.rate)}, up to ${fmt(ex.royalty.max)} baht`)}
          />
        </Disclosure>

        <Disclosure
          icon="rent"
          title={t('ค่าเช่า 40(5)', 'Rent 40(5)')}
          summary={sumRent ? t(`${fmt(sumRent)} บาท · หักค่าใช้จ่าย ${fmt(expenseOf('40-5'))}`, `${fmt(sumRent)} baht · expenses ${fmt(expenseOf('40-5'))}`) : none}
        >
          {rentKinds.map(([key, th, enLabel]) => (
            <MoneyField
              key={key}
              id={`rent-${key}`}
              label={t(th, enLabel)}
              value={inc.rent[key]}
              onChange={(v) => update((d) => void (d.income.rent[key] = v))}
              hint={t(`หักค่าใช้จ่ายเหมา ${pct(ex.rent[key])}`, `Flat-rate expenses ${pct(ex.rent[key])}`)}
            />
          ))}
        </Disclosure>

        <Disclosure
          icon="professional"
          title={t('วิชาชีพอิสระ 40(6)', 'Liberal professions 40(6)')}
          summary={inc.professional.medical + inc.professional.other ? baht(inc.professional.medical + inc.professional.other) : none}
        >
          <MoneyField
            id="prof-medical"
            label={t('การประกอบโรคศิลปะ (แพทย์ ทันตแพทย์ ฯลฯ)', 'Medical practice (doctors, dentists, etc.)')}
            value={inc.professional.medical}
            onChange={(v) => update((d) => void (d.income.professional.medical = v))}
            hint={t(`หักเหมา ${pct(ex.professional.medical)}`, `Flat-rate ${pct(ex.professional.medical)}`)}
          />
          <MoneyField
            id="prof-other"
            label={t('กฎหมาย วิศวกรรม สถาปัตยกรรม บัญชี ประณีตศิลปกรรม', 'Law, engineering, architecture, accounting, fine arts')}
            value={inc.professional.other}
            onChange={(v) => update((d) => void (d.income.professional.other = v))}
            hint={t(`หักเหมา ${pct(ex.professional.other)}`, `Flat-rate ${pct(ex.professional.other)}`)}
          />
        </Disclosure>

        {businessKinds.map(([key, titleTh, titleEn, labelTh, labelEn, rate]) => {
          const part = inc[key]
          const expense = fmt(expenseOf(key === 'contract' ? '40-7' : '40-8'))
          return (
            <Disclosure
              key={key}
              icon={key}
              title={t(titleTh, titleEn)}
              summary={part.amount ? t(`${fmt(part.amount)} บาท · หักค่าใช้จ่าย ${expense}`, `${fmt(part.amount)} baht · expenses ${expense}`) : none}
            >
              <MoneyField id={`${key}-amount`} label={t(labelTh, labelEn)} value={part.amount} onChange={(v) => update((d) => void (d.income[key].amount = v))} />
              <Toggle
                label={t('หักค่าใช้จ่ายตามจริง', 'Deduct actual expenses')}
                hint={t(
                  `ถ้าไม่เปิด จะหักเหมา ${pct(rate)} (ต้องมีหลักฐานค่าใช้จ่ายถ้าหักตามจริง)`,
                  `If off, a flat ${pct(rate)} is deducted. Actual expenses need receipts.`,
                )}
                checked={part.useActual}
                onChange={(v) => update((d) => void (d.income[key].useActual = v))}
              />
              {part.useActual && (
                <MoneyField
                  id={`${key}-actual`}
                  label={t('ค่าใช้จ่ายจริง', 'Actual expenses')}
                  value={part.actualExpense}
                  onChange={(v) => update((d) => void (d.income[key].actualExpense = v))}
                />
              )}
            </Disclosure>
          )
        })}

        <Disclosure
          icon="saving"
          title={t('เงินปันผล / ดอกเบี้ย 40(4)', 'Dividends / interest 40(4)')}
          summary={
            inv.dividends + inv.fundDividends + inv.interest
              ? baht(inv.dividends + inv.fundDividends + inv.interest) +
                (inv.includeDividends || inv.includeInterest ? t(' · นำมารวมคำนวณ', ' · included in calculation') : '')
              : none
          }
        >
          <MoneyField
            id="dividends"
            label={t('เงินปันผลจากหุ้นไทย (ก่อนหักภาษี)', 'Dividends from Thai shares (before tax)')}
            value={inv.dividends}
            onChange={(v) => update((d) => void (d.income.investment.dividends = v))}
            hint={t('ดูยอดในหนังสือรับรองการจ่ายเงินปันผล หรือในแอปโบรกเกอร์', 'See the dividend payment certificate or your broker app')}
          />
          {inv.dividends > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">{t('อัตราภาษีนิติบุคคลของบริษัทที่จ่าย', "Paying company's corporate tax rate")}</span>
              <Segmented
                label={t('อัตราภาษีนิติบุคคล', 'Corporate tax rate')}
                value={String(inv.dividendCorpRate)}
                options={[
                  { value: '0.2', label: t('20% (ทั่วไป)', '20% (standard)') },
                  { value: '0.1', label: '10%' },
                  { value: '0', label: t('ยกเว้น/BOI', 'Exempt/BOI') },
                ]}
                onChange={(v) => update((d) => void (d.income.investment.dividendCorpRate = Number(v)))}
              />
              <p className="text-sm text-muted">
                {t(
                  'ใช้คิดเครดิตภาษีเงินปันผล ดูได้ในหนังสือรับรอง บริษัทส่วนใหญ่เสียภาษี 20%',
                  'Used for the dividend tax credit. It is shown on the certificate; most companies pay 20%.',
                )}
              </p>
            </div>
          )}
          <MoneyField
            id="fund-dividends"
            label={t('เงินปันผลจากกองทุนรวม', 'Dividends from mutual funds')}
            value={inv.fundDividends}
            onChange={(v) => update((d) => void (d.income.investment.fundDividends = v))}
            hint={t('ถูกหักภาษี 10% เหมือนกัน แต่ไม่มีเครดิตภาษีเงินปันผล', 'Also withheld at 10%, but with no dividend tax credit')}
          />
          {inv.dividends + inv.fundDividends > 0 && (
            <>
              <Toggle
                label={t('นำเงินปันผลมารวมคำนวณภาษี', 'Include dividends in the tax calculation')}
                hint={t(
                  'ถ้าไม่เปิด ภาษี 10% ที่ถูกหักไว้ถือว่าจบ ถ้าเปิด ต้องนำเงินปันผลทั้งปีมารวม',
                  'If off, the 10% withheld is final. If on, all dividends for the year must be included.',
                )}
                checked={inv.includeDividends}
                onChange={(v) => update((d) => void (d.income.investment.includeDividends = v))}
              />
              {dividendChoice && (
                <p className={`rounded-xl px-3 py-2 text-sm ${dividendChoice.better === 'include' ? 'bg-refund-soft text-refund' : 'bg-accent-soft text-accent'}`}>
                  {t('นำมารวม', 'Include')}: {balanceText(dividendChoice.include)} · {t('ไม่นำมารวม', 'Exclude')}: {balanceText(dividendChoice.exclude)}
                  <b className="block">
                    {dividendChoice.better === 'include' ? t('แนะนำให้นำมารวมคำนวณ', 'Recommended: include them') : t('แนะนำไม่ต้องนำมารวม', 'Recommended: leave them out')}{' '}
                    {t(
                      `(ต่างกัน ${fmt(Math.abs(dividendChoice.include - dividendChoice.exclude))} บาท)`,
                      `(difference ${fmt(Math.abs(dividendChoice.include - dividendChoice.exclude))} baht)`,
                    )}
                  </b>
                </p>
              )}
            </>
          )}
          <MoneyField
            id="interest"
            label={t('ดอกเบี้ยเงินฝากที่ถูกหักภาษี 15%', 'Deposit interest with 15% tax withheld')}
            value={inv.interest}
            onChange={(v) => update((d) => void (d.income.investment.interest = v))}
            hint={t('ดอกเบี้ยออมทรัพย์รวมไม่เกิน 20,000 บาทต่อปีได้รับยกเว้น ไม่ต้องกรอก', 'Savings interest up to 20,000 baht a year is exempt; leave it out.')}
          />
          {inv.interest > 0 && (
            <Toggle
              label={t('นำดอกเบี้ยมารวมคำนวณภาษี', 'Include interest in the tax calculation')}
              hint={t('คุ้มเมื่อฐานภาษีของคุณต่ำกว่า 15%', 'Worth it when your tax bracket is below 15%')}
              checked={inv.includeInterest}
              onChange={(v) => update((d) => void (d.income.investment.includeInterest = v))}
            />
          )}
          <p className="rounded-xl bg-paper px-3 py-2 text-sm text-muted">
            {t(
              'กำไรจากการขายหุ้นไทยในตลาดหลักทรัพย์ได้รับยกเว้นภาษี ไม่ต้องกรอก ส่วนเงินได้จากหุ้นต่างประเทศ กรอกในหัวข้อ “เงินได้จากต่างประเทศ” ด้านล่าง',
              'Gains from selling Thai shares on the stock exchange are tax-exempt; leave them out. Enter income from foreign shares under “Foreign income” below.',
            )}
          </p>
        </Disclosure>

        <Disclosure icon="send" title={t('เงินได้จากต่างประเทศ', 'Foreign income')} summary={fx.employment + fx.investment ? baht(fx.employment + fx.investment) : none}>
          <p className="rounded-xl bg-paper px-3 py-2 text-sm">
            {en ? (
              <>
                If you stay in Thailand 180 days or more in the year, foreign income <b>earned from 2567 (2024)</b> is taxed in the <b>year you bring it into Thailand</b>{' '}
                (Revenue Department Order Por. 161/2566). Enter only the amount brought in during tax year {rules.taxYear}.
              </>
            ) : (
              <>
                ผู้ที่อยู่ในไทยตั้งแต่ 180 วันในปีนั้น ต้องนำเงินได้จากต่างประเทศที่<b>เกิดตั้งแต่ปี 2567</b> มาเสียภาษีใน<b>ปีที่นำเงินเข้าไทย</b> (คำสั่งกรมสรรพากร ป.161/2566)
                กรอกเฉพาะยอดที่นำเข้าไทยในปีภาษี {rules.taxYear}
              </>
            )}
          </p>
          <MoneyField
            id="fx-employment"
            label={t('ค่าจ้าง/เงินเดือนจากงานในต่างประเทศ ที่นำเข้าไทย', 'Pay from work abroad, brought into Thailand')}
            value={fx.employment}
            onChange={(v) => update((d) => void (d.income.foreign.employment = v))}
            hint={t('หักค่าใช้จ่าย 50% ร่วมเพดานกับเงินเดือนในไทย', '50% expense deduction, sharing the cap with Thai salary')}
          />
          <MoneyField
            id="fx-investment"
            label={t('ปันผล ดอกเบี้ย กำไรจากหุ้น/กองทุนต่างประเทศ ที่นำเข้าไทย', 'Dividends, interest and gains from foreign shares/funds, brought into Thailand')}
            value={fx.investment}
            onChange={(v) => update((d) => void (d.income.foreign.investment = v))}
            hint={t('ไม่มีการหักค่าใช้จ่าย กำไรจากการขายคิดจากส่วนกำไร ไม่ใช่เงินต้น', 'No expense deduction. For sales, count only the gain, not the principal.')}
          />
          {fx.employment + fx.investment > 0 && (
            <>
              <MoneyField
                id="fx-tax"
                label={t('ภาษีที่เสียในต่างประเทศแล้ว', 'Tax already paid abroad')}
                value={fx.taxPaid}
                onChange={(v) => update((d) => void (d.income.foreign.taxPaid = v))}
              />
              <Toggle
                label={t('ประเทศนั้นมีอนุสัญญาภาษีซ้อนกับไทย', 'That country has a double tax treaty with Thailand')}
                hint={
                  fx.hasTreaty
                    ? t(
                        `เครดิตภาษีได้ ${fmt(result.foreignTaxCredit)} บาท (ไม่เกินภาษีไทยของเงินได้ส่วนนี้)`,
                        `Tax credit ${fmt(result.foreignTaxCredit)} baht (capped at the Thai tax on this income)`,
                      )
                    : t(
                        'เช่น สหรัฐฯ ญี่ปุ่น สิงคโปร์ อังกฤษ ถ้ามีจะนำภาษีที่เสียแล้วมาหักได้',
                        'e.g. the US, Japan, Singapore, the UK. If so, tax already paid can be credited.',
                      )
                }
                checked={fx.hasTreaty}
                onChange={(v) => update((d) => void (d.income.foreign.hasTreaty = v))}
              />
            </>
          )}
          <p className="text-xs text-muted">
            {t(
              'ปี 2568 กรมสรรพากรเสนอยกเว้นภาษีถ้านำเงินเข้าไทยภายในปีที่ได้รับหรือปีถัดไป ตอนนี้ยังไม่พบประกาศบังคับใช้ ตรวจสอบประกาศล่าสุดก่อนยื่น',
              'In 2568 (2025) the Revenue Department proposed exempting income brought in within the year earned or the next year. No enforcing announcement has been found yet; check the latest announcement before filing.',
            )}
          </p>
        </Disclosure>
      </Section>

      <Section icon="receipt" title={t('ภาษีที่จ่ายล่วงหน้า', 'Tax prepaid')}>
        <MoneyField
          id="prepaid"
          label={t('ภาษีที่จ่ายตอนยื่น ภ.ง.ด.94 (ครึ่งปี)', 'Tax paid with the half-year return (P.N.D. 94)')}
          value={input.credits.prepaid}
          onChange={(v) => update((d) => void (d.credits.prepaid = v))}
          hint={t('สำหรับผู้มีรายได้ 40(5)–40(8) ที่ยื่นภาษีกลางปี', 'For people with 40(5)–40(8) income who file mid-year')}
        />
        <button type="button" onClick={onHalfYear} className="self-start rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
          {t('คำนวณ ภ.ง.ด.94 ครึ่งปี →', 'Work out the half-year P.N.D. 94 →')}
        </button>
      </Section>
    </div>
  )
}
