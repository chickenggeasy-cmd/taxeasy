import { SpouseCompare } from '../components/SpouseCompare'
import { Disclosure, MoneyField, PageHero, Section, Segmented, Stepper, Toggle } from '../components/ui'
import type { DeductionKey, TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt, pct } from '../lib/format'

type Update = (fn: (draft: TaxInput) => void) => void

export function Deductions({ input, update, rules, result }: { input: TaxInput; update: Update; rules: TaxRules; result: TaxResult }) {
  const r = rules.deductions
  const p = input.profile
  const line = (id: string) => result.deductions.find((l) => l.id === id)
  const groupTotal = (...ids: string[]) => ids.reduce((s, id) => s + (line(id)?.allowed ?? 0), 0)

  const money = (key: DeductionKey, label: string, max?: number, hint?: string) => (
    <MoneyField
      id={`d-${key}`}
      label={label}
      value={input.deductions[key] as number}
      onChange={(v) => update((d) => void ((d.deductions[key] as number) = v))}
      max={max}
      hint={hint}
      allowed={line(key)?.allowed ?? 0}
      note={line(key)?.note}
    />
  )

  const sp = input.spouse
  const setSp = (k: Exclude<keyof TaxInput['spouse'], 'parents'>) => (v: number) => update((d) => void (d.spouse[k] = v))
  const kids = input.deductions.children
  const thisYear = rules.taxYear

  return (
    <div className="anim-stagger flex flex-col gap-4">
      <PageHero art="deductions" title="ค่าลดหย่อน" subtitle={`ใช้สิทธิแล้ว ${fmt(result.totalDeductions)} บาท · แอปตรวจเพดานให้ทุกช่อง`} />
      <Section icon="profile" title="เกี่ยวกับคุณ" subtitle="ตอบตามจริง แอปจะเลือกสิทธิที่คุณได้ให้เอง">
        <Segmented
          label="สถานะสมรส"
          value={p.married ? 'married' : 'single'}
          options={[
            { value: 'single', label: 'โสด / หย่า' },
            { value: 'married', label: 'สมรสจดทะเบียน' },
          ]}
          onChange={(v) => update((d) => void (d.profile.married = v === 'married'))}
        />
        {p.married && (
          <Toggle
            label="คู่สมรสมีเงินได้"
            hint={p.spouseHasIncome ? 'ยื่นแยก: ใช้ลดหย่อนคู่สมรสไม่ได้' : `ลดหย่อนคู่สมรสได้ ${fmt(r.spouse)} บาท`}
            checked={p.spouseHasIncome}
            onChange={(v) => update((d) => void (d.profile.spouseHasIncome = v))}
          />
        )}
        {p.married && p.spouseHasIncome && (
          <Disclosure icon="family" title="ข้อมูลคู่สมรส" summary={sp.salary + sp.freelance ? `เงินได้ ${fmt(sp.salary + sp.freelance)} บาท · ใช้เทียบยื่นแยก/ยื่นรวม` : 'กรอกเพื่อเทียบยื่นแยก/ยื่นรวม'}>
            <MoneyField id="sp-salary" label="เงินเดือน + โบนัสทั้งปีของคู่สมรส" value={sp.salary} onChange={setSp('salary')} />
            <MoneyField id="sp-freelance" label="งานฟรีแลนซ์ 40(2) ของคู่สมรส" value={sp.freelance} onChange={setSp('freelance')} />
            <MoneyField id="sp-withheld" label="ภาษีที่คู่สมรสถูกหัก ณ ที่จ่าย" value={sp.withheld} onChange={setSp('withheld')} />
            <MoneyField id="sp-ss" label="ประกันสังคมของคู่สมรส" value={sp.socialSecurity} onChange={setSp('socialSecurity')} max={r.socialSecurity} />
            <MoneyField id="sp-life" label="เบี้ยประกันชีวิตของคู่สมรส" value={sp.lifeInsurance} onChange={setSp('lifeInsurance')} />
            <MoneyField id="sp-health" label="เบี้ยประกันสุขภาพของคู่สมรส" value={sp.healthInsurance} onChange={setSp('healthInsurance')} />
            <MoneyField id="sp-pvd" label="PVD ของคู่สมรส" value={sp.pvd} onChange={setSp('pvd')} />
            <MoneyField id="sp-rmf" label="RMF ของคู่สมรส" value={sp.rmf} onChange={setSp('rmf')} />
            <MoneyField id="sp-esg" label="ThaiESG ของคู่สมรส" value={sp.thaiEsg} onChange={setSp('thaiEsg')} />
            <Stepper label="บิดามารดาของคู่สมรสที่อุปการะ" value={sp.parents} max={2} onChange={(n) => update((d) => void (d.spouse.parents = n))} />
            <SpouseCompare input={input} rules={rules} />
          </Disclosure>
        )}
        <Toggle
          label="อายุ 65 ปีขึ้นไป หรือเป็นผู้พิการ"
          hint={`เงินได้ ${fmt(rules.elderlyExemption)} บาทแรกได้รับยกเว้น`}
          checked={p.elderlyOrDisabled}
          onChange={(v) => update((d) => void (d.profile.elderlyOrDisabled = v))}
        />
      </Section>

      <Section icon="family" title="ครอบครัว" subtitle={`ใช้สิทธิแล้ว ${fmt(groupTotal('children', 'parents', 'disabledCare', 'prenatal'))} บาท`}>
        <div className="flex flex-col gap-3">
          <Stepper
            label="บุตร"
            hint={`คนละ ${fmt(r.child)} · คนที่ 2 ขึ้นไปที่เกิดตั้งแต่ 2561 คนละ ${fmt(r.childSecondPlusBornFrom2561)}`}
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
                บุตรคนที่ {i + 1} เกิดปี พ.ศ.
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
          label="บิดามารดาที่อุปการะ"
          hint={`อายุ 60 ปีขึ้นไป เงินได้ไม่เกิน 30,000 บาท/ปี · คนละ ${fmt(r.parent)}`}
          value={input.deductions.parents}
          max={4}
          onChange={(n) => update((d) => void (d.deductions.parents = n))}
        />
        <Stepper
          label="ผู้พิการ/ทุพพลภาพที่อุปการะ"
          hint={`มีบัตรประจำตัวคนพิการ · คนละ ${fmt(r.disabledCare)}`}
          value={input.deductions.disabledCare}
          max={10}
          onChange={(n) => update((d) => void (d.deductions.disabledCare = n))}
        />
        {money('prenatal', 'ค่าฝากครรภ์และคลอดบุตร', r.prenatal, 'ต่อการตั้งครรภ์แต่ละครั้ง')}
      </Section>

      <Section icon="shield" title="ประกันและประกันสังคม" subtitle={`ใช้สิทธิแล้ว ${fmt(groupTotal('socialSecurity', 'lifeInsurance', 'healthInsurance', 'spouseLifeInsurance', 'parentHealthInsurance'))} บาท`}>
        {money('socialSecurity', 'เงินสมทบประกันสังคม', r.socialSecurity, 'ดูใน 50 ทวิ')}
        {money('lifeInsurance', 'เบี้ยประกันชีวิต', r.lifeInsurance, 'กรมธรรม์ 10 ปีขึ้นไป')}
        {money('healthInsurance', 'เบี้ยประกันสุขภาพตนเอง', r.healthInsurance, `รวมกับประกันชีวิตไม่เกิน ${fmt(r.lifeHealthCombined)}`)}
        {p.married && !p.spouseHasIncome && money('spouseLifeInsurance', 'เบี้ยประกันชีวิตคู่สมรส', r.spouseLifeInsurance)}
        {money('parentHealthInsurance', 'เบี้ยประกันสุขภาพบิดามารดา', r.parentHealthInsurance)}
      </Section>

      <Section icon="saving" title="ออมเพื่อเกษียณและกองทุน" subtitle={`กลุ่มเกษียณรวมกันไม่เกิน ${fmt(r.retirementCombined)} บาท`}>
        {money('pensionInsurance', 'เบี้ยประกันชีวิตแบบบำนาญ', r.pensionInsurance.max, `${pct(r.pensionInsurance.rate)} ของเงินได้`)}
        {money('pvd', 'กองทุนสำรองเลี้ยงชีพ (PVD) ส่วนที่คุณจ่าย', r.pvd.max, `${pct(r.pvd.rate)} ของค่าจ้าง`)}
        {money('gpf', 'กบข. / กองทุนสงเคราะห์ครูเอกชน', r.gpf.max)}
        {money('nsf', 'กองทุนการออมแห่งชาติ (กอช.)', r.nsf)}
        {money('rmf', 'กองทุน RMF', r.rmf.max, `${pct(r.rmf.rate)} ของเงินได้`)}
        {r.ssf && money('ssf', 'กองทุน SSF', r.ssf.max, `${pct(r.ssf.rate)} ของเงินได้`)}
        {r.thaiEsg && money('thaiEsg', 'กองทุน ThaiESG / ThaiESGX (เงินใหม่)', r.thaiEsg.max, `${pct(r.thaiEsg.rate)} ของเงินได้ · ไม่นับรวมกลุ่มเกษียณ`)}
        {r.thaiEsgxLtf > 0 && money('thaiEsgxLtf', 'ThaiESGX ส่วนที่สับเปลี่ยนจาก LTF', r.thaiEsgxLtf)}
      </Section>

      <Section icon="home" title="บ้านและอื่น ๆ">
        {money('homeLoanInterest', 'ดอกเบี้ยเงินกู้ซื้อที่อยู่อาศัย', r.homeLoanInterest)}
        {money('socialEnterprise', 'เงินลงทุนในวิสาหกิจเพื่อสังคม', r.socialEnterprise)}
        {money('politicalDonation', 'บริจาคพรรคการเมือง', r.politicalDonation)}
      </Section>

      {rules.measures.length > 0 && (
        <Section icon="sparkle" title={`มาตรการพิเศษปี ${rules.taxYear}`} subtitle="มาตรการที่รัฐประกาศเฉพาะปีนี้">
          {rules.measures.map((m) => {
            const allowed = line(`measure:${m.id}`)?.allowed ?? 0
            return (
              <Disclosure key={m.id} title={m.label} summary={allowed ? `ลดหย่อนได้ ${fmt(allowed)} บาท` : `สูงสุด ${fmt(m.maxDeduction)} บาท`}>
                {m.description && <p className="text-sm text-muted">{m.description}</p>}
                {m.inputs.map((inp) => (
                  <MoneyField
                    key={inp.id}
                    id={`m-${m.id}-${inp.id}`}
                    label={inp.label}
                    value={input.measures[m.id]?.[inp.id] ?? 0}
                    onChange={(v) =>
                      update((d) => {
                        d.measures[m.id] = { ...d.measures[m.id], [inp.id]: v }
                      })
                    }
                    max={inp.maxActual}
                  />
                ))}
                {m.maxActual && <p className="text-sm text-muted">ยอดจ่ายรวมกันไม่เกิน {fmt(m.maxActual)} บาท</p>}
              </Disclosure>
            )
          })}
        </Section>
      )}

      <Section icon="heart" title="เงินบริจาค" subtitle={`รวมแล้วไม่เกิน ${pct(r.donationCapRate)} ของเงินได้หลังหักลดหย่อน`}>
        {money('donationEducation', 'บริจาคการศึกษา กีฬา โรงพยาบาลรัฐ', undefined, 'หักได้ 2 เท่า ต้องผ่านระบบ e-Donation')}
        {money('donationGeneral', 'บริจาคทั่วไป (มูลนิธิ วัด ฯลฯ)')}
      </Section>
    </div>
  )
}
