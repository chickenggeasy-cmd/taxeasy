import { SpouseCompare } from '../components/SpouseCompare'
import { Disclosure, MoneyField, PageHero, Section, Segmented, Stepper, Toggle } from '../components/ui'
import type { DeductionKey, DeductionLine, TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'
import { useLang, useT } from '../lib/lang'

type Update = (fn: (draft: TaxInput) => void) => void

export function Deductions({ input, update, rules, result }: { input: TaxInput; update: Update; rules: TaxRules; result: TaxResult }) {
  const t = useT()
  const en = useLang() === 'en'
  const r = rules.deductions
  const p = input.profile
  const line = (id: string) => result.deductions.find((l) => l.id === id)
  const noteOf = (l: DeductionLine | undefined) => (l ? (en ? (l.noteEn ?? l.note) : l.note) : undefined)
  const groupTotal = (...ids: string[]) => ids.reduce((s, id) => s + (line(id)?.allowed ?? 0), 0)
  const claimed = (n: number) => t(`ใช้สิทธิแล้ว ${fmt(n)} บาท`, `${fmt(n)} baht claimed`)

  const money = (key: DeductionKey, label: string, max?: number, hint?: string) => (
    <MoneyField
      id={`d-${key}`}
      label={label}
      value={input.deductions[key] as number}
      onChange={(v) => update((d) => void ((d.deductions[key] as number) = v))}
      max={max}
      hint={hint}
      allowed={line(key)?.allowed ?? 0}
      note={noteOf(line(key))}
    />
  )

  const sp = input.spouse
  const setSp = (k: Exclude<keyof TaxInput['spouse'], 'parents'>) => (v: number) => update((d) => void (d.spouse[k] = v))
  const kids = input.deductions.children
  const thisYear = rules.taxYear

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <PageHero
        art="deductions"
        title={t('ค่าลดหย่อน', 'Deductions')}
        subtitle={t(`ใช้สิทธิแล้ว ${fmt(result.totalDeductions)} บาท · แอปตรวจเพดานให้ทุกช่อง`, `${fmt(result.totalDeductions)} baht claimed · every cap is checked for you`)}
      />
      <Section icon="profile" title={t('เกี่ยวกับคุณ', 'About you')} subtitle={t('ตอบตามจริง แอปจะเลือกสิทธิที่คุณได้ให้เอง', 'Answer honestly and the app picks the allowances you qualify for')}>
        <Segmented
          label={t('สถานะสมรส', 'Marital status')}
          value={p.married ? 'married' : 'single'}
          options={[
            { value: 'single', label: t('โสด / หย่า', 'Single / divorced') },
            { value: 'married', label: t('สมรสจดทะเบียน', 'Legally married') },
          ]}
          onChange={(v) => update((d) => void (d.profile.married = v === 'married'))}
        />
        {p.married && (
          <Toggle
            label={t('คู่สมรสมีเงินได้', 'Spouse has income')}
            hint={
              p.spouseHasIncome
                ? t('ยื่นแยก: ใช้ลดหย่อนคู่สมรสไม่ได้', 'Filing separately: no spouse allowance')
                : t(`ลดหย่อนคู่สมรสได้ ${fmt(r.spouse)} บาท`, `Spouse allowance: ${fmt(r.spouse)} baht`)
            }
            checked={p.spouseHasIncome}
            onChange={(v) => update((d) => void (d.profile.spouseHasIncome = v))}
          />
        )}
        {p.married && p.spouseHasIncome && (
          <Disclosure
            icon="family"
            title={t('ข้อมูลคู่สมรส', "Spouse's details")}
            summary={
              sp.salary + sp.freelance
                ? t(`เงินได้ ${fmt(sp.salary + sp.freelance)} บาท · ใช้เทียบยื่นแยก/ยื่นรวม`, `Income ${fmt(sp.salary + sp.freelance)} baht · used to compare separate and joint filing`)
                : t('กรอกเพื่อเทียบยื่นแยก/ยื่นรวม', 'Fill in to compare separate and joint filing')
            }
          >
            <MoneyField id="sp-salary" label={t('เงินเดือน + โบนัสทั้งปีของคู่สมรส', "Spouse's annual salary + bonus")} value={sp.salary} onChange={setSp('salary')} />
            <MoneyField id="sp-freelance" label={t('งานฟรีแลนซ์ 40(2) ของคู่สมรส', "Spouse's freelance income 40(2)")} value={sp.freelance} onChange={setSp('freelance')} />
            <MoneyField id="sp-withheld" label={t('ภาษีที่คู่สมรสถูกหัก ณ ที่จ่าย', "Spouse's tax withheld")} value={sp.withheld} onChange={setSp('withheld')} />
            <MoneyField id="sp-ss" label={t('ประกันสังคมของคู่สมรส', "Spouse's social security")} value={sp.socialSecurity} onChange={setSp('socialSecurity')} max={r.socialSecurity} />
            <MoneyField id="sp-life" label={t('เบี้ยประกันชีวิตของคู่สมรส', "Spouse's life insurance premiums")} value={sp.lifeInsurance} onChange={setSp('lifeInsurance')} />
            <MoneyField id="sp-health" label={t('เบี้ยประกันสุขภาพของคู่สมรส', "Spouse's health insurance premiums")} value={sp.healthInsurance} onChange={setSp('healthInsurance')} />
            <MoneyField id="sp-pvd" label={t('PVD ของคู่สมรส', "Spouse's PVD")} value={sp.pvd} onChange={setSp('pvd')} />
            <MoneyField id="sp-rmf" label={t('RMF ของคู่สมรส', "Spouse's RMF")} value={sp.rmf} onChange={setSp('rmf')} />
            <MoneyField id="sp-esg" label={t('ThaiESG ของคู่สมรส', "Spouse's ThaiESG")} value={sp.thaiEsg} onChange={setSp('thaiEsg')} />
            <Stepper
              label={t('บิดามารดาของคู่สมรสที่อุปการะ', "Spouse's parents supported")}
              value={sp.parents}
              max={2}
              onChange={(n) => update((d) => void (d.spouse.parents = n))}
            />
            <SpouseCompare input={input} rules={rules} />
          </Disclosure>
        )}
        <Toggle
          label={t('อายุ 65 ปีขึ้นไป หรือเป็นผู้พิการ', 'Aged 65 or over, or disabled')}
          hint={t(`เงินได้ ${fmt(rules.elderlyExemption)} บาทแรกได้รับยกเว้น`, `The first ${fmt(rules.elderlyExemption)} baht of income is exempt`)}
          checked={p.elderlyOrDisabled}
          onChange={(v) => update((d) => void (d.profile.elderlyOrDisabled = v))}
        />
      </Section>

      <Section icon="family" title={t('ครอบครัว', 'Family')} subtitle={claimed(groupTotal('children', 'parents', 'disabledCare', 'prenatal'))}>
        <div className="flex flex-col gap-3">
          <Stepper
            label={t('บุตร', 'Children')}
            hint={t(
              `คนละ ${fmt(r.child)} · คนที่ 2 ขึ้นไปที่เกิดตั้งแต่ 2561 คนละ ${fmt(r.childSecondPlusBornFrom2561)}`,
              `${fmt(r.child)} each · second and later children born from 2561 (2018): ${fmt(r.childSecondPlusBornFrom2561)} each`,
            )}
            value={kids.length}
            max={10}
            onChange={(n) =>
              update((d) => {
                const c = d.deductions.children
                while (c.length < n) c.push(thisYear)
                c.length = n
              })
            }
          />
          {kids.map((year, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2">
              <label htmlFor={`kid-${i}`} className="text-sm">
                {t(`บุตรคนที่ ${i + 1} เกิดปี พ.ศ.`, `Child ${i + 1}, birth year (B.E.)`)}
              </label>
              <input
                id={`kid-${i}`}
                inputMode="numeric"
                className="num w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-right"
                value={year || ''}
                onChange={(e) => update((d) => void (d.deductions.children[i] = Number(e.target.value.replace(/\D/g, '').slice(0, 4))))}
              />
            </div>
          ))}
        </div>
        <Stepper
          label={t('บิดามารดาที่อุปการะ', 'Parents you support')}
          hint={t(`อายุ 60 ปีขึ้นไป เงินได้ไม่เกิน 30,000 บาท/ปี · คนละ ${fmt(r.parent)}`, `Aged 60+, income up to 30,000 baht/year · ${fmt(r.parent)} each`)}
          value={input.deductions.parents}
          max={4}
          onChange={(n) => update((d) => void (d.deductions.parents = n))}
        />
        <Stepper
          label={t('ผู้พิการ/ทุพพลภาพที่อุปการะ', 'Disabled dependants you support')}
          hint={t(`มีบัตรประจำตัวคนพิการ · คนละ ${fmt(r.disabledCare)}`, `Must hold a disability ID card · ${fmt(r.disabledCare)} each`)}
          value={input.deductions.disabledCare}
          max={10}
          onChange={(n) => update((d) => void (d.deductions.disabledCare = n))}
        />
        {money('prenatal', t('ค่าฝากครรภ์และคลอดบุตร', 'Pregnancy and childbirth costs'), r.prenatal, t('ต่อการตั้งครรภ์แต่ละครั้ง', 'Per pregnancy'))}
      </Section>

      <Section
        icon="shield"
        title={t('ประกันและประกันสังคม', 'Insurance and social security')}
        subtitle={claimed(groupTotal('socialSecurity', 'lifeInsurance', 'healthInsurance', 'spouseLifeInsurance', 'parentHealthInsurance'))}
      >
        {money('socialSecurity', t('เงินสมทบประกันสังคม', 'Social security contributions'), r.socialSecurity, t('ดูใน 50 ทวิ', 'Shown on the 50 Tawi'))}
        {money('lifeInsurance', t('เบี้ยประกันชีวิต', 'Life insurance premiums'), r.lifeInsurance, t('กรมธรรม์ 10 ปีขึ้นไป', 'Policies of 10 years or more'))}
        {money(
          'healthInsurance',
          t('เบี้ยประกันสุขภาพตนเอง', 'Own health insurance premiums'),
          r.healthInsurance,
          t(`รวมกับประกันชีวิตไม่เกิน ${fmt(r.lifeHealthCombined)}`, `Up to ${fmt(r.lifeHealthCombined)} combined with life insurance`),
        )}
        {p.married && !p.spouseHasIncome && money('spouseLifeInsurance', t('เบี้ยประกันชีวิตคู่สมรส', "Spouse's life insurance premiums"), r.spouseLifeInsurance)}
        {money('parentHealthInsurance', t('เบี้ยประกันสุขภาพบิดามารดา', "Parents' health insurance premiums"), r.parentHealthInsurance)}
      </Section>

      <Section
        icon="saving"
        title={t('ออมเพื่อเกษียณและกองทุน', 'Retirement savings and funds')}
        subtitle={t(`กลุ่มเกษียณรวมกันไม่เกิน ${fmt(r.retirementCombined)} บาท`, `Retirement group capped at ${fmt(r.retirementCombined)} baht combined`)}
      >
        {money(
          'pensionInsurance',
          t('เบี้ยประกันชีวิตแบบบำนาญ', 'Pension life insurance premiums'),
          r.pensionInsurance.max,
          t(`${pct(r.pensionInsurance.rate)} ของเงินได้`, `${pct(r.pensionInsurance.rate)} of income`),
        )}
        {money('pvd', t('กองทุนสำรองเลี้ยงชีพ (PVD) ส่วนที่คุณจ่าย', 'Provident fund (PVD), your contribution'), r.pvd.max, t(`${pct(r.pvd.rate)} ของค่าจ้าง`, `${pct(r.pvd.rate)} of wages`))}
        {money('gpf', t('กบข. / กองทุนสงเคราะห์ครูเอกชน', 'GPF / Private school teachers welfare fund'), r.gpf.max)}
        {money('nsf', t('กองทุนการออมแห่งชาติ (กอช.)', 'National Savings Fund (NSF)'), r.nsf)}
        {money('rmf', t('กองทุน RMF', 'RMF fund'), r.rmf.max, t(`${pct(r.rmf.rate)} ของเงินได้`, `${pct(r.rmf.rate)} of income`))}
        {r.ssf && money('ssf', t('กองทุน SSF', 'SSF fund'), r.ssf.max, t(`${pct(r.ssf.rate)} ของเงินได้`, `${pct(r.ssf.rate)} of income`))}
        {r.thaiEsg &&
          money(
            'thaiEsg',
            t('กองทุน ThaiESG / ThaiESGX (เงินใหม่)', 'ThaiESG / ThaiESGX fund (new money)'),
            r.thaiEsg.max,
            t(`${pct(r.thaiEsg.rate)} ของเงินได้ · ไม่นับรวมกลุ่มเกษียณ`, `${pct(r.thaiEsg.rate)} of income · not part of the retirement group`),
          )}
        {r.thaiEsgxLtf > 0 && money('thaiEsgxLtf', t('ThaiESGX ส่วนที่สับเปลี่ยนจาก LTF', 'ThaiESGX switched from LTF'), r.thaiEsgxLtf)}
      </Section>

      <Section icon="home" title={t('บ้านและอื่น ๆ', 'Home and other')}>
        {money('homeLoanInterest', t('ดอกเบี้ยเงินกู้ซื้อที่อยู่อาศัย', 'Home loan interest'), r.homeLoanInterest)}
        {money('socialEnterprise', t('เงินลงทุนในวิสาหกิจเพื่อสังคม', 'Investment in social enterprises'), r.socialEnterprise)}
        {money('politicalDonation', t('บริจาคพรรคการเมือง', 'Political party donations'), r.politicalDonation)}
      </Section>

      {rules.measures.length > 0 && (
        <Section icon="sparkle" title={t(`มาตรการพิเศษปี ${rules.taxYear}`, `Special measures for ${rules.taxYear}`)} subtitle={t('มาตรการที่รัฐประกาศเฉพาะปีนี้', 'Measures announced for this year only')}>
          {rules.measures.map((m) => {
            const allowed = line(`measure:${m.id}`)?.allowed ?? 0
            const description = en ? (m.descriptionEn ?? m.description) : m.description
            return (
              <Disclosure
                key={m.id}
                title={t(m.label, m.labelEn ?? m.label)}
                summary={allowed ? t(`ลดหย่อนได้ ${fmt(allowed)} บาท`, `Deduction: ${fmt(allowed)} baht`) : t(`สูงสุด ${fmt(m.maxDeduction)} บาท`, `Up to ${fmt(m.maxDeduction)} baht`)}
              >
                {description && <p className="text-sm text-muted">{description}</p>}
                {m.inputs.map((inp) => (
                  <MoneyField
                    key={inp.id}
                    id={`m-${m.id}-${inp.id}`}
                    label={t(inp.label, inp.labelEn ?? inp.label)}
                    value={input.measures[m.id]?.[inp.id] ?? 0}
                    onChange={(v) =>
                      update((d) => {
                        d.measures[m.id] = { ...d.measures[m.id], [inp.id]: v }
                      })
                    }
                    max={inp.maxActual}
                  />
                ))}
                {m.maxActual && <p className="text-sm text-muted">{t(`ยอดจ่ายรวมกันไม่เกิน ${fmt(m.maxActual)} บาท`, `Combined spending up to ${fmt(m.maxActual)} baht`)}</p>}
              </Disclosure>
            )
          })}
        </Section>
      )}

      <Section
        icon="heart"
        title={t('เงินบริจาค', 'Donations')}
        subtitle={t(`รวมแล้วไม่เกิน ${pct(r.donationCapRate)} ของเงินได้หลังหักลดหย่อน`, `Up to ${pct(r.donationCapRate)} of income after deductions in total`)}
      >
        {money(
          'donationEducation',
          t('บริจาคการศึกษา กีฬา โรงพยาบาลรัฐ', 'Education, sports and public hospital donations'),
          undefined,
          t('หักได้ 2 เท่า ต้องผ่านระบบ e-Donation', 'Counts double; must go through e-Donation'),
        )}
        {money('donationGeneral', t('บริจาคทั่วไป (มูลนิธิ วัด ฯลฯ)', 'General donations (foundations, temples, etc.)'))}
      </Section>
    </div>
  )
}
