import { Disclosure, MoneyField, PageHero, Section, Segmented, Toggle } from '../components/ui'
import { compareDividendChoice } from '../engine/plan'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'

type Update = (fn: (draft: TaxInput) => void) => void

export function Income({ input, update, rules, result }: { input: TaxInput; update: Update; rules: TaxRules; result: TaxResult }) {
  const inc = input.income
  const ex = rules.expenses
  const expenseOf = (id: string) => result.incomes.find((l) => l.id === id)?.expense ?? 0
  const sumRent = Object.values(inc.rent).reduce((a, b) => a + b, 0)
  const inv = inc.investment
  const dividendChoice = compareDividendChoice(input, rules)
  const balanceText = (b: number) => (b < 0 ? `ได้คืน ${fmt(-b)}` : b > 0 ? `จ่ายเพิ่ม ${fmt(b)}` : 'ไม่ต้องจ่ายเพิ่ม')

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <PageHero art="income" title="รายได้ทั้งปี" subtitle="กรอกเฉพาะประเภทที่คุณมี แอปหักค่าใช้จ่ายตามกฎหมายให้เอง" />
      <Section icon="salary" title="เงินเดือน" subtitle="ดูยอดได้จากหนังสือรับรอง 50 ทวิ ที่บริษัทออกให้">
        <MoneyField
          id="salary"
          label="เงินเดือน + โบนัส ทั้งปี 40(1)"
          value={inc.salary}
          onChange={(v) => update((d) => void (d.income.salary = v))}
          hint={`หักค่าใช้จ่ายได้ ${pct(ex.employment.rate)} ไม่เกิน ${fmt(ex.employment.max)} บาท (รวมกับ 40(2))`}
        />
        <MoneyField
          id="withheld"
          label="ภาษีที่ถูกหัก ณ ที่จ่ายทั้งปี"
          value={input.credits.withheld}
          onChange={(v) => update((d) => void (d.credits.withheld = v))}
          hint="รวมทุกใบ 50 ทวิ ทั้งจากงานประจำและงานฟรีแลนซ์"
        />
      </Section>

      <Section icon="coins" title="รายได้อื่น" subtitle="เปิดเฉพาะประเภทที่คุณมี">
        <Disclosure icon="freelance" title="ฟรีแลนซ์ / ค่านายหน้า 40(2)" summary={inc.freelance ? `${fmt(inc.freelance)} บาท` : 'ไม่มี'}>
          <MoneyField
            id="freelance"
            label="ค่าจ้างงานฟรีแลนซ์ ค่านายหน้า ค่าเบี้ยประชุม"
            value={inc.freelance}
            onChange={(v) => update((d) => void (d.income.freelance = v))}
            hint="ใช้เพดานหักค่าใช้จ่ายร่วมกับเงินเดือน"
          />
        </Disclosure>

        <Disclosure icon="royalty" title="ค่าลิขสิทธิ์ 40(3)" summary={inc.royalty ? `${fmt(inc.royalty)} บาท` : 'ไม่มี'}>
          <MoneyField
            id="royalty"
            label="ค่าลิขสิทธิ์ / ค่าสิทธิ"
            value={inc.royalty}
            onChange={(v) => update((d) => void (d.income.royalty = v))}
            hint={`หักค่าใช้จ่าย ${pct(ex.royalty.rate)} ไม่เกิน ${fmt(ex.royalty.max)} บาท`}
          />
        </Disclosure>

        <Disclosure icon="rent" title="ค่าเช่า 40(5)" summary={sumRent ? `${fmt(sumRent)} บาท · หักค่าใช้จ่าย ${fmt(expenseOf('40-5'))}` : 'ไม่มี'}>
          {(
            [
              ['building', 'บ้าน อาคาร สิ่งปลูกสร้าง'],
              ['agriLand', 'ที่ดินเกษตรกรรม'],
              ['otherLand', 'ที่ดินอื่น'],
              ['vehicle', 'ยานพาหนะ'],
              ['other', 'ทรัพย์สินอื่น'],
            ] as const
          ).map(([key, label]) => (
            <MoneyField
              key={key}
              id={`rent-${key}`}
              label={label}
              value={inc.rent[key]}
              onChange={(v) => update((d) => void (d.income.rent[key] = v))}
              hint={`หักค่าใช้จ่ายเหมา ${pct(ex.rent[key])}`}
            />
          ))}
        </Disclosure>

        <Disclosure
          icon="professional"
          title="วิชาชีพอิสระ 40(6)"
          summary={inc.professional.medical + inc.professional.other ? `${fmt(inc.professional.medical + inc.professional.other)} บาท` : 'ไม่มี'}
        >
          <MoneyField
            id="prof-medical"
            label="การประกอบโรคศิลปะ (แพทย์ ทันตแพทย์ ฯลฯ)"
            value={inc.professional.medical}
            onChange={(v) => update((d) => void (d.income.professional.medical = v))}
            hint={`หักเหมา ${pct(ex.professional.medical)}`}
          />
          <MoneyField
            id="prof-other"
            label="กฎหมาย วิศวกรรม สถาปัตยกรรม บัญชี ประณีตศิลปกรรม"
            value={inc.professional.other}
            onChange={(v) => update((d) => void (d.income.professional.other = v))}
            hint={`หักเหมา ${pct(ex.professional.other)}`}
          />
        </Disclosure>

        {(
          [
            ['contract', 'รับเหมา 40(7)', 'ค่ารับเหมาที่ผู้รับเหมาจัดหาสัมภาระเอง', ex.contract.rate],
            ['business', 'ค้าขาย / ธุรกิจ / อื่น ๆ 40(8)', 'ขายของออนไลน์ รับจ้างผลิต เงินได้อื่นที่ไม่เข้าประเภทข้างบน', ex.business.rate],
          ] as const
        ).map(([key, title, label, rate]) => {
          const part = inc[key]
          return (
            <Disclosure key={key} icon={key} title={title} summary={part.amount ? `${fmt(part.amount)} บาท · หักค่าใช้จ่าย ${fmt(expenseOf(key === 'contract' ? '40-7' : '40-8'))}` : 'ไม่มี'}>
              <MoneyField id={`${key}-amount`} label={label} value={part.amount} onChange={(v) => update((d) => void (d.income[key].amount = v))} />
              <Toggle
                label="หักค่าใช้จ่ายตามจริง"
                hint={`ถ้าไม่เปิด จะหักเหมา ${pct(rate)} (ต้องมีหลักฐานค่าใช้จ่ายถ้าหักตามจริง)`}
                checked={part.useActual}
                onChange={(v) => update((d) => void (d.income[key].useActual = v))}
              />
              {part.useActual && (
                <MoneyField
                  id={`${key}-actual`}
                  label="ค่าใช้จ่ายจริง"
                  value={part.actualExpense}
                  onChange={(v) => update((d) => void (d.income[key].actualExpense = v))}
                />
              )}
            </Disclosure>
          )
        })}

        <Disclosure
          icon="saving"
          title="เงินปันผล / ดอกเบี้ย 40(4)"
          summary={inv.dividends + inv.fundDividends + inv.interest ? `${fmt(inv.dividends + inv.fundDividends + inv.interest)} บาท${inv.includeDividends || inv.includeInterest ? ' · นำมารวมคำนวณ' : ''}` : 'ไม่มี'}
        >
          <MoneyField
            id="dividends"
            label="เงินปันผลจากหุ้นไทย (ก่อนหักภาษี)"
            value={inv.dividends}
            onChange={(v) => update((d) => void (d.income.investment.dividends = v))}
            hint="ดูยอดในหนังสือรับรองการจ่ายเงินปันผล หรือในแอปโบรกเกอร์"
          />
          {inv.dividends > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">อัตราภาษีนิติบุคคลของบริษัทที่จ่าย</span>
              <Segmented
                label="อัตราภาษีนิติบุคคล"
                value={String(inv.dividendCorpRate)}
                options={[
                  { value: '0.2', label: '20% (ทั่วไป)' },
                  { value: '0.1', label: '10%' },
                  { value: '0', label: 'ยกเว้น/BOI' },
                ]}
                onChange={(v) => update((d) => void (d.income.investment.dividendCorpRate = Number(v)))}
              />
              <p className="text-sm text-muted">ใช้คิดเครดิตภาษีเงินปันผล ดูได้ในหนังสือรับรอง บริษัทส่วนใหญ่เสียภาษี 20%</p>
            </div>
          )}
          <MoneyField
            id="fund-dividends"
            label="เงินปันผลจากกองทุนรวม"
            value={inv.fundDividends}
            onChange={(v) => update((d) => void (d.income.investment.fundDividends = v))}
            hint="ถูกหักภาษี 10% เหมือนกัน แต่ไม่มีเครดิตภาษีเงินปันผล"
          />
          {inv.dividends + inv.fundDividends > 0 && (
            <>
              <Toggle
                label="นำเงินปันผลมารวมคำนวณภาษี"
                hint="ถ้าไม่เปิด ภาษี 10% ที่ถูกหักไว้ถือว่าจบ ถ้าเปิด ต้องนำเงินปันผลทั้งปีมารวม"
                checked={inv.includeDividends}
                onChange={(v) => update((d) => void (d.income.investment.includeDividends = v))}
              />
              {dividendChoice && (
                <p className={`rounded-xl px-3 py-2 text-sm ${dividendChoice.better === 'include' ? 'bg-refund-soft text-refund' : 'bg-accent-soft text-accent'}`}>
                  นำมารวม: {balanceText(dividendChoice.include)} · ไม่นำมารวม: {balanceText(dividendChoice.exclude)}
                  <b className="block">
                    แนะนำ{dividendChoice.better === 'include' ? 'ให้นำมารวมคำนวณ' : 'ไม่ต้องนำมารวม'} (ต่างกัน {fmt(Math.abs(dividendChoice.include - dividendChoice.exclude))} บาท)
                  </b>
                </p>
              )}
            </>
          )}
          <MoneyField
            id="interest"
            label="ดอกเบี้ยเงินฝากที่ถูกหักภาษี 15%"
            value={inv.interest}
            onChange={(v) => update((d) => void (d.income.investment.interest = v))}
            hint="ดอกเบี้ยออมทรัพย์รวมไม่เกิน 20,000 บาทต่อปีได้รับยกเว้น ไม่ต้องกรอก"
          />
          {inv.interest > 0 && (
            <Toggle
              label="นำดอกเบี้ยมารวมคำนวณภาษี"
              hint="คุ้มเมื่อฐานภาษีของคุณต่ำกว่า 15%"
              checked={inv.includeInterest}
              onChange={(v) => update((d) => void (d.income.investment.includeInterest = v))}
            />
          )}
          <p className="rounded-xl bg-paper px-3 py-2 text-sm text-muted">
            กำไรจากการขายหุ้นไทยในตลาดหลักทรัพย์ได้รับยกเว้นภาษี ไม่ต้องกรอก ส่วนเงินได้จากหุ้นต่างประเทศที่นำเข้าไทยตั้งแต่ปี 2567 ต้องเสียภาษี แอปยังไม่คำนวณส่วนนี้
          </p>
        </Disclosure>
      </Section>

      <Section icon="receipt" title="ภาษีที่จ่ายล่วงหน้า">
        <MoneyField
          id="prepaid"
          label="ภาษีที่จ่ายตอนยื่น ภ.ง.ด.94 (ครึ่งปี)"
          value={input.credits.prepaid}
          onChange={(v) => update((d) => void (d.credits.prepaid = v))}
          hint="สำหรับผู้มีรายได้ 40(5)–40(8) ที่ยื่นภาษีกลางปี"
        />
      </Section>
    </div>
  )
}
