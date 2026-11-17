import type { FilingThresholds, TaxInput, TaxResult, TaxRules } from '../engine/types'
import { fmt } from './format'
import type { Lang } from './lang'

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

export function filingSteps(input: TaxInput, result: TaxResult, rules: TaxRules, lang: Lang = 'th'): FilingStep[] {
  const t = (th: string, en: string) => (lang === 'en' ? en : th)
  const form = formType(input)
  const p = input.profile
  const steps: FilingStep[] = []

  steps.push({
    id: 'form',
    title: t('เลือกแบบที่จะยื่น', 'Choose the form'),
    detail: t(
      'เข้าระบบ e-Filing ของกรมสรรพากร ด้วยเลขบัตรประชาชน แล้วเลือกแบบฟอร์ม',
      'Log in to the Revenue Department e-Filing system with your national ID number, then choose the form',
    ),
    fields: [
      {
        label: t('แบบที่ต้องใช้', 'Form to use'),
        value: lang === 'en' ? FORM_LABEL_EN[form] : FORM_LABEL[form],
        note: form === 'PND91' ? t('มีเงินเดือน/ค่าจ้างอย่างเดียว', 'Salary or wages only') : t('มีเงินได้ประเภทอื่นนอกจากเงินเดือน', 'You have income other than salary'),
      },
      { label: t('ปีภาษี', 'Tax year'), value: String(rules.taxYear) },
    ],
  })

  steps.push({
    id: 'status',
    title: t('ข้อมูลผู้ยื่น', 'Your details'),
    fields: [
      {
        label: t('สถานภาพ', 'Marital status'),
        value: !p.married
          ? t('โสด / หม้าย / หย่า', 'Single / widowed / divorced')
          : p.spouseHasIncome
            ? t('สมรส (คู่สมรสมีเงินได้ แยกยื่น)', 'Married (spouse has income, filing separately)')
            : t('สมรส (คู่สมรสไม่มีเงินได้)', 'Married (spouse has no income)'),
      },
      ...(p.elderlyOrDisabled
        ? [{ label: t('ผู้มีอายุ 65 ปีขึ้นไป / ผู้พิการ', 'Aged 65 or over / person with a disability'), value: t('ติ๊กช่องนี้ ระบบจะยกเว้นเงินได้ให้', 'Tick this box and the exemption is applied') }]
        : []),
    ],
  })

  const incomeFields: FilingField[] = result.incomes.map((l) => ({
    label: lang === 'en' ? l.labelEn : l.label,
    amount: l.gross,
    note: l.id === '40-1-2' ? t('ดูยอดในหนังสือรับรอง 50 ทวิ', 'Shown on the 50 Tawi certificate') : undefined,
  }))
  const chooseActual = t('เลือก “หักตามจริง” ในระบบ', 'Choose “actual expenses” in the system')
  if (input.income.business.amount > 0 && input.income.business.useActual) {
    incomeFields.push({ label: t('ค่าใช้จ่าย 40(8) แบบหักตามจริง', 'Actual expenses for 40(8)'), amount: input.income.business.actualExpense, note: chooseActual })
  }
  if (input.income.contract.amount > 0 && input.income.contract.useActual) {
    incomeFields.push({ label: t('ค่าใช้จ่าย 40(7) แบบหักตามจริง', 'Actual expenses for 40(7)'), amount: input.income.contract.actualExpense, note: chooseActual })
  }
  incomeFields.push({
    label: t('ภาษีที่ถูกหัก ณ ที่จ่ายทั้งหมด', 'Total tax withheld'),
    amount: input.credits.withheld,
    note: t('กรอกแยกตามแต่ละใบ 50 ทวิ ในช่องของเงินได้นั้น ๆ', 'Enter it per 50 Tawi certificate, in the box for that income'),
  })
  steps.push({
    id: 'income',
    title: t('กรอกเงินได้', 'Enter your income'),
    detail: t('ระบบหักค่าใช้จ่ายให้เองตามประเภทเงินได้', 'The system applies expense allowances by income type'),
    fields: incomeFields,
  })

  // ค่าลดหย่อน: กรอกยอดที่จ่ายจริงตามหลักฐาน ระบบ e-Filing จะคิดเพดานให้เอง
  const skip = new Set(['personal', 'donationEducation', 'donationGeneral'])
  const deductionFields: FilingField[] = result.deductions
    .filter((d) => !skip.has(d.id) && d.allowed > 0)
    .map((d) => {
      const label = lang === 'en' ? d.labelEn : d.label
      if (d.id === 'spouse') return { label, value: t('ระบบเติมให้เมื่อเลือกสถานภาพ', 'Filled in once you choose your status') }
      if (d.id === 'children')
        return {
          label: t('บุตร', 'Children'),
          value: t(`${input.deductions.children.length} คน`, String(input.deductions.children.length)),
          note: t('กรอกเลขบัตรประชาชนและปีเกิดของบุตรแต่ละคน', "Enter each child's national ID number and year of birth"),
        }
      if (d.id === 'parents')
        return {
          label: t('อุปการะบิดามารดา', 'Parents supported'),
          value: t(`${input.deductions.parents} คน`, String(input.deductions.parents)),
          note: t('กรอกเลขบัตรประชาชนของบิดามารดา', "Enter your parents' national ID numbers"),
        }
      if (d.id === 'disabledCare')
        return { label: t('อุปการะผู้พิการ', 'Disabled dependants supported'), value: t(`${input.deductions.disabledCare} คน`, String(input.deductions.disabledCare)) }
      return {
        label,
        amount: d.claimed,
        note:
          d.claimed > d.allowed
            ? t(`ใช้สิทธิได้ ${Math.round(d.allowed).toLocaleString()} บาท ระบบคิดเพดานให้เอง`, `Allowed: ${Math.round(d.allowed).toLocaleString()} baht; the system applies the cap`)
            : undefined,
      }
    })
  if (deductionFields.length) {
    steps.push({
      id: 'deductions',
      title: t('กรอกค่าลดหย่อน', 'Enter your deductions'),
      detail: t(
        'กรอกยอดที่จ่ายจริงตามหลักฐาน ค่าลดหย่อนส่วนตัว 60,000 บาท ระบบใส่ให้เอง',
        'Enter what you actually paid, as shown on your evidence. The 60,000 baht personal allowance is added for you.',
      ),
      fields: deductionFields,
    })
  }

  const donations: FilingField[] = []
  if (input.deductions.donationEducation > 0)
    donations.push({
      label: t('เงินบริจาคการศึกษา/กีฬา/โรงพยาบาลรัฐ', 'Education / sports / public hospital donations'),
      amount: input.deductions.donationEducation,
      note: t('ส่วนใหญ่ระบบดึงจาก e-Donation ให้เอง ตรวจยอดให้ตรง', 'Usually pulled in from e-Donation; check the amount matches'),
    })
  if (input.deductions.donationGeneral > 0) donations.push({ label: t('เงินบริจาคทั่วไป', 'General donations'), amount: input.deductions.donationGeneral })
  if (donations.length) steps.push({ id: 'donations', title: t('กรอกเงินบริจาค', 'Enter donations'), fields: donations })

  steps.push({
    id: 'check',
    title: t('ตรวจผลก่อนกดยื่น', 'Check before you submit'),
    detail: t(
      'ตัวเลขในระบบควรใกล้เคียงกับที่ภาษีง่ายๆ คำนวณ ถ้าต่างกันมาก ให้ย้อนตรวจช่องที่กรอก',
      "The system's figures should be close to TaxEasy's. If they differ a lot, go back and check what you entered.",
    ),
    fields: [
      { label: t('เงินได้สุทธิ', 'Net taxable income'), amount: result.netIncome },
      { label: t('ภาษีที่คำนวณได้', 'Tax calculated'), amount: result.tax },
      result.balance < 0
        ? {
            label: t('ชำระไว้เกิน (ได้คืน)', 'Overpaid (refund)'),
            amount: -result.balance,
            note: t(
              'เงินคืนจะโอนเข้าพร้อมเพย์ที่ผูกกับเลขบัตรประชาชน ผูกไว้ก่อนยื่น',
              'Refunds go to the PromptPay account linked to your national ID number. Link it before you file.',
            ),
          }
        : {
            label: t('ภาษีที่ต้องชำระเพิ่ม', 'Tax to pay'),
            amount: result.balance,
            note:
              result.balance > 0
                ? t(
                    'ชำระได้ทางธนาคาร พร้อมเพย์ หรือบัตรเครดิต ถ้าภาษีตั้งแต่ 3,000 บาทและยื่นตรงเวลา ผ่อนชำระได้ 3 งวด',
                    'Pay by bank, PromptPay or credit card. If it is 3,000 baht or more and you file on time, you can pay in 3 instalments.',
                  )
                : undefined,
          },
    ],
  })
  return steps
}

export interface DocItem {
  id: string
  title: string
  detail: string
}

/** เอกสารที่ควรเตรียม สร้างจากสิ่งที่ผู้ใช้กรอก (id เหมือนกันทุกภาษา เพื่อให้รายการที่ติ๊กไว้ไม่หาย) */
export function documentChecklist(input: TaxInput, rules: TaxRules, lang: Lang = 'th'): DocItem[] {
  const t = (th: string, en: string) => (lang === 'en' ? en : th)
  const d = input.deductions
  const i = input.income
  const docs: DocItem[] = []
  const add = (cond: boolean, id: string, title: string, detail: string) => cond && docs.push({ id, title, detail })

  add(
    i.salary > 0,
    'pnd50',
    t('หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) จากนายจ้าง', 'Withholding tax certificate (50 Tawi) from your employer'),
    t('มียอดเงินเดือน ภาษีที่ถูกหัก ประกันสังคม และกองทุนสำรองเลี้ยงชีพ', 'Shows salary, tax withheld, social security and provident fund'),
  )
  add(
    i.freelance + i.professional.medical + i.professional.other + i.contract.amount + i.royalty > 0,
    'pnd50-other',
    t('50 ทวิ จากผู้จ้างงานอื่น ๆ', '50 Tawi from other payers'),
    t('ขอจากทุกบริษัทที่จ่ายค่าจ้างฟรีแลนซ์/ค่าวิชาชีพ และหักภาษีไว้', 'Ask every company that paid you freelance or professional fees and withheld tax'),
  )
  add(
    (i.investment.includeDividends && i.investment.dividends + i.investment.fundDividends > 0) || (i.investment.includeInterest && i.investment.interest > 0),
    'dividend',
    t('หนังสือรับรองการจ่ายเงินปันผล/ดอกเบี้ย', 'Dividend / interest payment certificate'),
    t(
      'ขอจากบริษัทหลักทรัพย์ ศูนย์รับฝากหลักทรัพย์ (TSD) หรือธนาคาร ต้องมียอดเครดิตภาษีเงินปันผลระบุไว้',
      'From your broker, Thailand Securities Depository (TSD) or bank. It must show the dividend tax credit.',
    ),
  )
  add(
    i.foreign.employment + i.foreign.investment > 0,
    'foreign',
    t('หลักฐานเงินได้ต่างประเทศและการโอนเงินเข้าไทย', 'Evidence of foreign income and transfers into Thailand'),
    t(
      'สเตตเมนต์โบรกเกอร์/นายจ้างต่างประเทศ หลักฐานการโอนเข้าไทย และหลักฐานภาษีที่เสียในต่างประเทศ (ถ้าจะขอเครดิต)',
      'Statements from the foreign broker or employer, proof of transfer into Thailand, and proof of tax paid abroad (if claiming a credit)',
    ),
  )
  add(Object.values(i.rent).some((v) => v > 0), 'rent', t('สัญญาเช่าและหลักฐานรับค่าเช่า', 'Lease agreements and rent receipts'), t('ใช้ยืนยันรายได้ค่าเช่าทั้งปี', 'To support your rental income for the year'))
  add(
    i.business.amount > 0 || i.contract.amount > 0,
    'biz',
    t('บัญชีรายรับ-รายจ่ายของธุรกิจ', 'Business income and expense records'),
    i.business.useActual || i.contract.useActual
      ? t('หักค่าใช้จ่ายตามจริง ต้องเก็บใบเสร็จ/ใบกำกับภาษีค่าใช้จ่ายทุกใบ', 'For actual expenses, keep every expense receipt or tax invoice')
      : t('แม้หักแบบเหมา ก็ควรมีบันทึกรายรับไว้', 'Even with flat-rate expenses, keep a record of income'),
  )
  add(input.credits.prepaid > 0, 'pnd94', t('แบบ ภ.ง.ด.94 และใบเสร็จภาษีครึ่งปี', 'P.N.D. 94 form and the half-year tax receipt'), t('ใช้หักภาษีที่จ่ายไปแล้วตอนกลางปี', 'Used to credit tax already paid mid-year'))

  add(
    d.parents > 0,
    'ly03',
    t('แบบ ล.ย.03 และเลขบัตรประชาชนบิดามารดา', "Form L.Y. 03 and your parents' ID numbers"),
    t('บิดามารดาอายุ 60 ปีขึ้นไป และมีเงินได้ไม่เกิน 30,000 บาทต่อปี', 'Parents must be 60 or older with income of up to 30,000 baht a year'),
  )
  add(d.disabledCare > 0, 'ly04', t('แบบ ล.ย.04 และบัตรประจำตัวคนพิการ', 'Form L.Y. 04 and the disability ID card'), t('สำหรับค่าอุปการะผู้พิการหรือคนทุพพลภาพ', 'For the disabled or incapacitated dependant allowance'))
  add(d.children.length > 0, 'children', t('เลขบัตรประชาชนของบุตรทุกคน', "All your children's national ID numbers"), t('สูติบัตรเก็บไว้เผื่อถูกขอดู', 'Keep birth certificates in case they are requested'))
  add(d.prenatal > 0, 'prenatal', t('ใบเสร็จค่าฝากครรภ์และค่าคลอด', 'Pregnancy and childbirth receipts'), t('จากโรงพยาบาลหรือสถานพยาบาล', 'From the hospital or clinic'))
  add(
    d.lifeInsurance + d.healthInsurance + d.pensionInsurance + d.spouseLifeInsurance + d.parentHealthInsurance > 0,
    'insurance',
    t('หนังสือรับรองการชำระเบี้ยประกัน', 'Insurance premium payment certificates'),
    t(
      'ขอจากบริษัทประกัน และยินยอมให้บริษัทส่งข้อมูลให้กรมสรรพากร ไม่อย่างนั้นใช้สิทธิไม่ได้',
      'From your insurer. You must let the insurer send the data to the Revenue Department, or the deduction is not allowed.',
    ),
  )
  add(
    d.rmf + d.ssf + d.thaiEsg + d.thaiEsgxLtf > 0,
    'funds',
    t('หนังสือรับรองการซื้อหน่วยลงทุน (RMF/ThaiESG)', 'Fund purchase certificates (RMF / ThaiESG)'),
    t('ขอจาก บลจ. หรือแอปที่ซื้อ เก็บไว้ทุกกองทุน', 'From the asset management company or the app you used; keep one for every fund'),
  )
  add(d.nsf > 0, 'nsf', t('หนังสือรับรองเงินสะสม กอช.', 'National Savings Fund (NSF) statement'), t('ดาวน์โหลดได้จากแอปหรือเว็บ กอช.', 'Download it from the NSF app or website'))
  add(
    d.homeLoanInterest > 0,
    'home',
    t('หนังสือรับรองดอกเบี้ยเงินกู้ซื้อบ้าน', 'Home loan interest certificate'),
    t('ธนาคารส่งให้ทุกต้นปี ถ้ากู้ร่วมให้หารตามจำนวนผู้กู้', 'Banks send it early each year. For a joint loan, split it by the number of borrowers.'),
  )
  add(d.socialEnterprise > 0, 'se', t('หลักฐานการลงทุนในวิสาหกิจเพื่อสังคม', 'Evidence of social enterprise investment'), t('หนังสือรับรองจากวิสาหกิจ', 'A certificate from the enterprise'))
  add(
    d.donationEducation + d.donationGeneral + d.politicalDonation > 0,
    'donation',
    t('หลักฐานเงินบริจาค', 'Donation evidence'),
    t(
      'ถ้าบริจาคผ่าน e-Donation ระบบส่งข้อมูลให้เอง ไม่ต้องเก็บใบเสร็จ ถ้าไม่ใช่ ให้เก็บใบอนุโมทนาบัตร',
      'Donations through e-Donation are reported automatically, so no receipt is needed. Otherwise keep the receipt.',
    ),
  )
  for (const m of rules.measures) {
    const paid = Object.values(input.measures[m.id] ?? {}).some((v) => v > 0)
    add(
      paid,
      `measure-${m.id}`,
      t(`ใบกำกับภาษีสำหรับ ${m.label}`, `Tax invoices for ${m.labelEn ?? m.label}`),
      t('ต้องเป็น e-Tax Invoice หรือ e-Receipt ที่มีชื่อและเลขประจำตัวผู้เสียภาษีของคุณ', 'Must be an e-Tax Invoice or e-Receipt showing your name and tax ID number'),
    )
  }
  add(
    true,
    'promptpay',
    t('ผูกพร้อมเพย์กับเลขบัตรประชาชน', 'Link PromptPay to your national ID number'),
    t('กรมสรรพากรคืนเงินภาษีผ่านพร้อมเพย์ที่ผูกกับเลขบัตรประชาชนเท่านั้น', 'The Revenue Department pays refunds only to PromptPay linked to your national ID number'),
  )
  return docs
}

/** เกณฑ์ตามประมวลรัษฎากร มาตรา 56 ใช้เมื่อกฎภาษีฉบับเก่าไม่มี filingThresholds (ค่าเดียวกับ server/bootstrap.php) */
export const DEFAULT_FILING_THRESHOLDS: FilingThresholds = {
  single: { salaryOnly: 120_000, other: 60_000 },
  married: { salaryOnly: 220_000, other: 120_000 },
}

export interface FilingRequirement {
  /** required = กฎหมายบังคับยื่น, refund = ไม่บังคับแต่ต้องยื่นถึงจะได้เงินคืน, none = ไม่ต้องยื่น */
  status: 'required' | 'refund' | 'none'
  form: FormType
  /** เงินได้ทั้งปีที่ใช้เทียบเกณฑ์ (รวมของคู่สมรสถ้ามี) */
  income: number
  threshold: number
  title: string
  reason: string
  /** ข้อความภาษาอังกฤษของเหตุผลเดียวกัน */
  titleEn: string
  reasonEn: string
}

const FORM_LABEL: Record<FormType, string> = { PND91: 'ภ.ง.ด.91', PND90: 'ภ.ง.ด.90' }
const FORM_LABEL_EN: Record<FormType, string> = { PND91: 'P.N.D. 91', PND90: 'P.N.D. 90' }

/**
 * ต้องยื่นแบบหรือไม่ แม้ไม่ต้องเสียภาษี — เทียบเงินได้ก่อนหักค่าใช้จ่ายกับเกณฑ์ของสถานะนั้น
 * เงินปันผล/ดอกเบี้ยที่เลือกไม่นำมารวม (ภาษีหัก ณ ที่จ่ายเป็นที่สุด) ไม่นับ และไม่หักยกเว้นผู้สูงอายุออกก่อน
 */
export function filingRequirement(input: TaxInput, result: TaxResult, rules: TaxRules): FilingRequirement | null {
  if (result.totalIncome <= 0) return null
  const t = rules.filingThresholds ?? DEFAULT_FILING_THRESHOLDS
  const married = input.profile.married
  const spouseEarns = married && input.profile.spouseHasIncome
  const spouseIncome = spouseEarns ? input.spouse.salary + input.spouse.freelance : 0
  const salaryOnly = formType(input) === 'PND91' && !(spouseEarns && input.spouse.freelance > 0)
  const income = result.totalIncome + spouseIncome
  const group = married ? t.married : t.single
  const threshold = salaryOnly ? group.salaryOnly : group.other
  const form = formType(input)

  const who = married ? 'มีคู่สมรส' : 'โสด'
  const kind = salaryOnly ? 'มีเงินเดือนอย่างเดียว' : 'มีเงินได้ประเภทอื่นนอกจากเงินเดือน'
  const subject = `${spouseIncome > 0 ? 'เงินได้ของคุณและคู่สมรสรวม' : salaryOnly ? 'เงินเดือนทั้งปี' : 'เงินได้ทั้งปี'} ${fmt(income)} บาท`
  const rule = `เกณฑ์ ${fmt(threshold)} บาท (${who} ${kind})`

  // ฉบับภาษาอังกฤษ ใช้ความหมายเดียวกันกับฉบับไทยทุกประการ
  const whoEn = married ? 'married' : 'single'
  const kindEn = salaryOnly ? 'salary only' : 'with other income types'
  const subjectEn = `${spouseIncome > 0 ? 'Your and your spouse’s combined income' : salaryOnly ? 'Annual salary' : 'Annual income'} ฿${fmt(income)}`
  const ruleEn = `the ฿${fmt(threshold)} threshold (${whoEn}, ${kindEn})`
  const amountEn = `฿${fmt(Math.abs(result.balance))}`

  if (income > threshold || result.balance > 0) {
    return {
      status: 'required',
      form,
      income,
      threshold,
      title: `ต้องยื่นแบบ ${FORM_LABEL[form]}`,
      reason:
        income > threshold
          ? `${subject} เกิน${rule}${result.tax === 0 ? ' จึงต้องยื่นแบบแม้ไม่ต้องเสียภาษี' : ''}`
          : `มีภาษีต้องชำระเพิ่ม ${fmt(result.balance)} บาท`,
      titleEn: `You must file ${FORM_LABEL_EN[form]}`,
      reasonEn:
        income > threshold
          ? `${subjectEn} is above ${ruleEn}${result.tax === 0 ? '. You must file even though no tax is due.' : '.'}`
          : `You owe ${amountEn} more tax.`,
    }
  }
  if (result.balance < 0) {
    return {
      status: 'refund',
      form,
      income,
      threshold,
      title: `ควรยื่นแบบ ${FORM_LABEL[form]} เพื่อขอเงินคืน`,
      reason: `${subject} ไม่เกิน${rule} กฎหมายจึงไม่บังคับยื่น แต่ต้องยื่นแบบถึงจะได้เงินภาษีที่ถูกหักไว้คืน ${fmt(-result.balance)} บาท`,
      titleEn: `You should file ${FORM_LABEL_EN[form]} to claim a refund`,
      reasonEn: `${subjectEn} is within ${ruleEn}, so filing is not required. But you must file to get back the ${amountEn} tax withheld.`,
    }
  }
  return {
    status: 'none',
    form,
    income,
    threshold,
    title: 'ไม่ต้องยื่นแบบ',
    reason: `${subject} ไม่เกิน${rule}`,
    titleEn: 'No need to file',
    reasonEn: `${subjectEn} is within ${ruleEn}.`,
  }
}

/** ตัวเลขจากแบบที่ยื่นจริง (ภ.ง.ด.90/91) ที่ผู้ใช้กรอกมาเทียบ — undefined = ยังไม่ได้กรอก */
export interface FiledFigures {
  netIncome?: number
  tax?: number
  /** ยอดที่ได้คืน (ใส่เป็นบวก) */
  refund?: number
  /** ยอดที่ต้องจ่ายเพิ่ม (ใส่เป็นบวก) */
  due?: number
}

export interface FiledRow {
  key: 'netIncome' | 'tax' | 'balance'
  /** ค่าที่แอปคำนวณ */
  ours: number
  /** ค่าตามแบบที่ยื่น */
  filed: number
  /** ผลต่าง (แอป − แบบที่ยื่น) */
  diff: number
  /** ตรงกันเมื่อต่างไม่เกิน 1 บาท (ปัดเศษของกรมฯ) */
  match: boolean
}

/** เทียบเฉพาะรายการที่ผู้ใช้กรอก ยอดได้คืน/จ่ายเพิ่มเทียบเป็นยอดสุทธิ (+ จ่ายเพิ่ม, − ได้คืน) เหมือนแอปคำนวณ */
export function compareWithFiled(result: TaxResult, filed: FiledFigures): FiledRow[] {
  const rows: FiledRow[] = []
  const add = (key: FiledRow['key'], ours: number, theirs: number) => {
    const diff = Math.round((ours - theirs) * 100) / 100
    rows.push({ key, ours, filed: theirs, diff, match: Math.abs(diff) <= 1 })
  }
  if (filed.netIncome !== undefined) add('netIncome', result.netIncome, filed.netIncome)
  if (filed.tax !== undefined) add('tax', result.tax, filed.tax)
  if (filed.refund !== undefined || filed.due !== undefined) {
    add('balance', result.balance, (filed.due ?? 0) - (filed.refund ?? 0))
  }
  return rows
}
