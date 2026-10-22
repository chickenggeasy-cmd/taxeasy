import type { TaxInput, TaxResult, TaxRules } from '../engine/types'

export type FormType = 'PND91' | 'PND90'

export interface FilingField {
  label: string
  /** ตัวเลขที่ต้องกรอก (ไม่มี = ให้เลือก/ติ๊กตามข้อความ) */
  amount?: number
  value?: string
  note?: string
}

export interface FilingStep {
  id: string
  title: string
  detail?: string
  fields: FilingField[]
}

/** มีเงินได้ประเภทอื่นนอกจาก 40(1) → ภ.ง.ด.90, เงินเดือนอย่างเดียว → ภ.ง.ด.91 */
export function formType(input: TaxInput): FormType {
  const i = input.income
  const other =
    (i.investment.includeDividends ? i.investment.dividends + i.investment.fundDividends : 0) +
    (i.investment.includeInterest ? i.investment.interest : 0) +
    i.foreign.employment +
    i.foreign.investment +
    i.freelance +
    i.royalty + Object.values(i.rent).reduce((a, b) => a + b, 0) + i.professional.medical + i.professional.other + i.contract.amount + i.business.amount
  return other > 0 ? 'PND90' : 'PND91'
}

export function filingSteps(input: TaxInput, result: TaxResult, rules: TaxRules): FilingStep[] {
  const form = formType(input)
  const p = input.profile
  const steps: FilingStep[] = []

  steps.push({
    id: 'form',
    title: 'เลือกแบบที่จะยื่น',
    detail: 'เข้าระบบ e-Filing ของกรมสรรพากร ด้วยเลขบัตรประชาชน แล้วเลือกแบบฟอร์ม',
    fields: [
      {
        label: 'แบบที่ต้องใช้',
        value: form === 'PND91' ? 'ภ.ง.ด.91' : 'ภ.ง.ด.90',
        note: form === 'PND91' ? 'มีเงินเดือน/ค่าจ้างอย่างเดียว' : 'มีเงินได้ประเภทอื่นนอกจากเงินเดือน',
      },
      { label: 'ปีภาษี', value: String(rules.taxYear) },
    ],
  })

  steps.push({
    id: 'status',
    title: 'ข้อมูลผู้ยื่น',
    fields: [
      {
        label: 'สถานภาพ',
        value: !p.married ? 'โสด / หม้าย / หย่า' : p.spouseHasIncome ? 'สมรส (คู่สมรสมีเงินได้ แยกยื่น)' : 'สมรส (คู่สมรสไม่มีเงินได้)',
      },
      ...(p.elderlyOrDisabled ? [{ label: 'ผู้มีอายุ 65 ปีขึ้นไป / ผู้พิการ', value: 'ติ๊กช่องนี้ ระบบจะยกเว้นเงินได้ให้' }] : []),
    ],
  })

  const incomeFields: FilingField[] = result.incomes.map((l) => ({
    label: l.label,
    amount: l.gross,
    note: l.id === '40-1-2' ? 'ดูยอดในหนังสือรับรอง 50 ทวิ' : undefined,
  }))
  if (input.income.business.amount > 0 && input.income.business.useActual) {
    incomeFields.push({ label: 'ค่าใช้จ่าย 40(8) แบบหักตามจริง', amount: input.income.business.actualExpense, note: 'เลือก “หักตามจริง” ในระบบ' })
  }
  if (input.income.contract.amount > 0 && input.income.contract.useActual) {
    incomeFields.push({ label: 'ค่าใช้จ่าย 40(7) แบบหักตามจริง', amount: input.income.contract.actualExpense, note: 'เลือก “หักตามจริง” ในระบบ' })
  }
  incomeFields.push({ label: 'ภาษีที่ถูกหัก ณ ที่จ่ายทั้งหมด', amount: input.credits.withheld, note: 'กรอกแยกตามแต่ละใบ 50 ทวิ ในช่องของเงินได้นั้น ๆ' })
  steps.push({
    id: 'income',
    title: 'กรอกเงินได้',
    detail: 'ระบบหักค่าใช้จ่ายให้เองตามประเภทเงินได้',
    fields: incomeFields,
  })

  // ค่าลดหย่อน: กรอกยอดที่จ่ายจริงตามหลักฐาน ระบบ e-Filing จะคิดเพดานให้เอง
  const skip = new Set(['personal', 'donationEducation', 'donationGeneral'])
  const deductionFields: FilingField[] = result.deductions
    .filter((d) => !skip.has(d.id) && d.allowed > 0)
    .map((d) => {
      if (d.id === 'spouse') return { label: d.label, value: 'ระบบเติมให้เมื่อเลือกสถานภาพ' }
      if (d.id === 'children') return { label: 'บุตร', value: `${input.deductions.children.length} คน`, note: 'กรอกเลขบัตรประชาชนและปีเกิดของบุตรแต่ละคน' }
      if (d.id === 'parents') return { label: 'อุปการะบิดามารดา', value: `${input.deductions.parents} คน`, note: 'กรอกเลขบัตรประชาชนของบิดามารดา' }
      if (d.id === 'disabledCare') return { label: 'อุปการะผู้พิการ', value: `${input.deductions.disabledCare} คน` }
      return { label: d.label, amount: d.claimed, note: d.claimed > d.allowed ? `ใช้สิทธิได้ ${Math.round(d.allowed).toLocaleString()} บาท ระบบคิดเพดานให้เอง` : undefined }
    })
  if (deductionFields.length) {
    steps.push({
      id: 'deductions',
      title: 'กรอกค่าลดหย่อน',
      detail: 'กรอกยอดที่จ่ายจริงตามหลักฐาน ค่าลดหย่อนส่วนตัว 60,000 บาท ระบบใส่ให้เอง',
      fields: deductionFields,
    })
  }

  const donations: FilingField[] = []
  if (input.deductions.donationEducation > 0) donations.push({ label: 'เงินบริจาคการศึกษา/กีฬา/โรงพยาบาลรัฐ', amount: input.deductions.donationEducation, note: 'ส่วนใหญ่ระบบดึงจาก e-Donation ให้เอง ตรวจยอดให้ตรง' })
  if (input.deductions.donationGeneral > 0) donations.push({ label: 'เงินบริจาคทั่วไป', amount: input.deductions.donationGeneral })
  if (donations.length) steps.push({ id: 'donations', title: 'กรอกเงินบริจาค', fields: donations })

  steps.push({
    id: 'check',
    title: 'ตรวจผลก่อนกดยื่น',
    detail: 'ตัวเลขในระบบควรใกล้เคียงกับที่ภาษีง่ายๆ คำนวณ ถ้าต่างกันมาก ให้ย้อนตรวจช่องที่กรอก',
    fields: [
      { label: 'เงินได้สุทธิ', amount: result.netIncome },
      { label: 'ภาษีที่คำนวณได้', amount: result.tax },
      result.balance < 0
        ? { label: 'ชำระไว้เกิน (ได้คืน)', amount: -result.balance, note: 'เงินคืนจะโอนเข้าพร้อมเพย์ที่ผูกกับเลขบัตรประชาชน ผูกไว้ก่อนยื่น' }
        : { label: 'ภาษีที่ต้องชำระเพิ่ม', amount: result.balance, note: result.balance > 0 ? 'ชำระได้ทางธนาคาร พร้อมเพย์ หรือบัตรเครดิต ถ้าภาษีตั้งแต่ 3,000 บาทและยื่นตรงเวลา ผ่อนชำระได้ 3 งวด' : undefined },
    ],
  })
  return steps
}

export interface DocItem {
  id: string
  title: string
  detail: string
}

/** เอกสารที่ควรเตรียม สร้างจากสิ่งที่ผู้ใช้กรอก */
export function documentChecklist(input: TaxInput, rules: TaxRules): DocItem[] {
  const d = input.deductions
  const i = input.income
  const docs: DocItem[] = []
  const add = (cond: boolean, id: string, title: string, detail: string) => cond && docs.push({ id, title, detail })

  add(i.salary > 0, 'pnd50', 'หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) จากนายจ้าง', 'มียอดเงินเดือน ภาษีที่ถูกหัก ประกันสังคม และกองทุนสำรองเลี้ยงชีพ')
  add(i.freelance + i.professional.medical + i.professional.other + i.contract.amount + i.royalty > 0, 'pnd50-other', '50 ทวิ จากผู้จ้างงานอื่น ๆ', 'ขอจากทุกบริษัทที่จ่ายค่าจ้างฟรีแลนซ์/ค่าวิชาชีพ และหักภาษีไว้')
  add(
    (i.investment.includeDividends && i.investment.dividends + i.investment.fundDividends > 0) || (i.investment.includeInterest && i.investment.interest > 0),
    'dividend',
    'หนังสือรับรองการจ่ายเงินปันผล/ดอกเบี้ย',
    'ขอจากบริษัทหลักทรัพย์ ศูนย์รับฝากหลักทรัพย์ (TSD) หรือธนาคาร ต้องมียอดเครดิตภาษีเงินปันผลระบุไว้',
  )
  add(i.foreign.employment + i.foreign.investment > 0, 'foreign', 'หลักฐานเงินได้ต่างประเทศและการโอนเงินเข้าไทย', 'สเตตเมนต์โบรกเกอร์/นายจ้างต่างประเทศ หลักฐานการโอนเข้าไทย และหลักฐานภาษีที่เสียในต่างประเทศ (ถ้าจะขอเครดิต)')
  add(Object.values(i.rent).some((v) => v > 0), 'rent', 'สัญญาเช่าและหลักฐานรับค่าเช่า', 'ใช้ยืนยันรายได้ค่าเช่าทั้งปี')
  add(i.business.amount > 0 || i.contract.amount > 0, 'biz', 'บัญชีรายรับ-รายจ่ายของธุรกิจ', i.business.useActual || i.contract.useActual ? 'หักค่าใช้จ่ายตามจริง ต้องเก็บใบเสร็จ/ใบกำกับภาษีค่าใช้จ่ายทุกใบ' : 'แม้หักแบบเหมา ก็ควรมีบันทึกรายรับไว้')
  add(input.credits.prepaid > 0, 'pnd94', 'แบบ ภ.ง.ด.94 และใบเสร็จภาษีครึ่งปี', 'ใช้หักภาษีที่จ่ายไปแล้วตอนกลางปี')

  add(d.parents > 0, 'ly03', 'แบบ ล.ย.03 และเลขบัตรประชาชนบิดามารดา', 'บิดามารดาอายุ 60 ปีขึ้นไป และมีเงินได้ไม่เกิน 30,000 บาทต่อปี')
  add(d.disabledCare > 0, 'ly04', 'แบบ ล.ย.04 และบัตรประจำตัวคนพิการ', 'สำหรับค่าอุปการะผู้พิการหรือคนทุพพลภาพ')
  add(d.children.length > 0, 'children', 'เลขบัตรประชาชนของบุตรทุกคน', 'สูติบัตรเก็บไว้เผื่อถูกขอดู')
  add(d.prenatal > 0, 'prenatal', 'ใบเสร็จค่าฝากครรภ์และค่าคลอด', 'จากโรงพยาบาลหรือสถานพยาบาล')
  add(d.lifeInsurance + d.healthInsurance + d.pensionInsurance + d.spouseLifeInsurance + d.parentHealthInsurance > 0, 'insurance', 'หนังสือรับรองการชำระเบี้ยประกัน', 'ขอจากบริษัทประกัน และยินยอมให้บริษัทส่งข้อมูลให้กรมสรรพากร ไม่อย่างนั้นใช้สิทธิไม่ได้')
  add(d.rmf + d.ssf + d.thaiEsg + d.thaiEsgxLtf > 0, 'funds', 'หนังสือรับรองการซื้อหน่วยลงทุน (RMF/ThaiESG)', 'ขอจาก บลจ. หรือแอปที่ซื้อ เก็บไว้ทุกกองทุน')
  add(d.nsf > 0, 'nsf', 'หนังสือรับรองเงินสะสม กอช.', 'ดาวน์โหลดได้จากแอปหรือเว็บ กอช.')
  add(d.homeLoanInterest > 0, 'home', 'หนังสือรับรองดอกเบี้ยเงินกู้ซื้อบ้าน', 'ธนาคารส่งให้ทุกต้นปี ถ้ากู้ร่วมให้หารตามจำนวนผู้กู้')
  add(d.socialEnterprise > 0, 'se', 'หลักฐานการลงทุนในวิสาหกิจเพื่อสังคม', 'หนังสือรับรองจากวิสาหกิจ')
  add(d.donationEducation + d.donationGeneral + d.politicalDonation > 0, 'donation', 'หลักฐานเงินบริจาค', 'ถ้าบริจาคผ่าน e-Donation ระบบส่งข้อมูลให้เอง ไม่ต้องเก็บใบเสร็จ ถ้าไม่ใช่ ให้เก็บใบอนุโมทนาบัตร')
  for (const m of rules.measures) {
    const paid = Object.values(input.measures[m.id] ?? {}).some((v) => v > 0)
    add(paid, `measure-${m.id}`, `ใบกำกับภาษีสำหรับ ${m.label}`, 'ต้องเป็น e-Tax Invoice หรือ e-Receipt ที่มีชื่อและเลขประจำตัวผู้เสียภาษีของคุณ')
  }
  add(true, 'promptpay', 'ผูกพร้อมเพย์กับเลขบัตรประชาชน', 'กรมสรรพากรคืนเงินภาษีผ่านพร้อมเพย์ที่ผูกกับเลขบัตรประชาชนเท่านั้น')
  return docs
}
