import type { BracketLine, DeductionLine, IncomeLine, Measure, TaxInput, TaxResult, TaxRules } from './types'

const clamp = (value: number, max: number) => Math.max(0, Math.min(value || 0, max))
const round2 = (n: number) => Math.round(n * 100) / 100
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

export function progressiveTax(netIncome: number, rules: TaxRules): { tax: number; lines: BracketLine[] } {
  const lines: BracketLine[] = []
  let from = 0
  for (const b of rules.brackets) {
    const to = b.upTo
    const taxable = Math.max(0, Math.min(netIncome, to ?? Infinity) - from)
    lines.push({ from, to, rate: b.rate, taxable, tax: taxable * b.rate })
    if (to === null) break
    from = to
  }
  return { tax: round2(sum(lines.map((l) => l.tax))), lines }
}

export function marginalRate(netIncome: number, rules: TaxRules): number {
  for (const b of rules.brackets) {
    if (b.upTo === null || netIncome < b.upTo) return b.rate
  }
  return rules.brackets[rules.brackets.length - 1].rate
}

/** ยอดลดหย่อนของมาตรการพิเศษ: ใช้ยอดที่ตัวคูณสูงก่อนเมื่อชนเพดานยอดจ่ายรวม (เป็นประโยชน์กับผู้เสียภาษีที่สุด) */
export function measureDeduction(measure: Measure, values: Record<string, number> | undefined): number {
  let remainingActual = measure.maxActual ?? Infinity
  let total = 0
  const inputs = [...measure.inputs].sort((a, b) => b.multiplier - a.multiplier)
  for (const input of inputs) {
    let actual = clamp(values?.[input.id] ?? 0, input.maxActual ?? Infinity)
    actual = Math.min(actual, remainingActual)
    remainingActual -= actual
    const base = input.step ? Math.floor(actual / input.step) * input.step : actual
    total += base * input.multiplier
  }
  return Math.min(total, measure.maxDeduction)
}

export function calculateTax(input: TaxInput, rules: TaxRules): TaxResult {
  const { income, deductions: d, profile } = input
  const ex = rules.expenses
  const warnings: string[] = []

  // 1) เงินได้และค่าใช้จ่าย
  const rentGross = sum(Object.values(income.rent))
  const rentExpense =
    income.rent.building * ex.rent.building +
    income.rent.agriLand * ex.rent.agriLand +
    income.rent.otherLand * ex.rent.otherLand +
    income.rent.vehicle * ex.rent.vehicle +
    income.rent.other * ex.rent.other
  const employmentGross = income.salary + income.freelance
  const employmentExpense = Math.min(employmentGross * ex.employment.rate, ex.employment.max)
  const flatOrActual = (part: { amount: number; useActual: boolean; actualExpense: number }, rate: number) =>
    part.useActual ? clamp(part.actualExpense, part.amount) : part.amount * rate

  // 40(4): นำมารวมคำนวณเฉพาะเมื่อผู้ใช้เลือก (ไม่เลือก = ภาษีที่ถูกหักไว้ถือเป็นที่สุด)
  const inv = income.investment
  const invRates = rules.investment ?? { dividendWithholdingRate: 0.1, interestWithholdingRate: 0.15 }
  const corpRate = Math.min(Math.max(inv.dividendCorpRate || 0, 0), 0.5)
  const dividendCredit = inv.includeDividends ? round2((inv.dividends * corpRate) / (1 - corpRate)) : 0
  const investmentGross =
    (inv.includeDividends ? inv.dividends + dividendCredit + inv.fundDividends : 0) + (inv.includeInterest ? inv.interest : 0)
  const investmentWithheld = round2(
    (inv.includeDividends ? (inv.dividends + inv.fundDividends) * invRates.dividendWithholdingRate : 0) +
      (inv.includeInterest ? inv.interest * invRates.interestWithholdingRate : 0),
  )

  const incomes: IncomeLine[] = [
    { id: '40-1-2', label: 'เงินเดือน/ค่าจ้าง และงานรับจ้างทั่วไป 40(1)(2)', gross: employmentGross, expense: employmentExpense },
    { id: '40-3', label: 'ค่าลิขสิทธิ์ 40(3)', gross: income.royalty, expense: Math.min(income.royalty * ex.royalty.rate, ex.royalty.max) },
    { id: '40-5', label: 'ค่าเช่าทรัพย์สิน 40(5)', gross: rentGross, expense: rentExpense },
    {
      id: '40-6',
      label: 'วิชาชีพอิสระ 40(6)',
      gross: income.professional.medical + income.professional.other,
      expense: income.professional.medical * ex.professional.medical + income.professional.other * ex.professional.other,
    },
    { id: '40-4', label: 'เงินปันผล/ดอกเบี้ย 40(4)', gross: investmentGross, expense: 0 },
    { id: '40-7', label: 'รับเหมา 40(7)', gross: income.contract.amount, expense: flatOrActual(income.contract, ex.contract.rate) },
    { id: '40-8', label: 'ธุรกิจ/ค้าขาย/อื่น ๆ 40(8)', gross: income.business.amount, expense: flatOrActual(income.business, ex.business.rate) },
  ]
    .filter((l) => l.gross > 0)
    .map((l) => ({ ...l, expense: round2(l.expense) }))

  const totalIncome = sum(incomes.map((l) => l.gross))
  const totalExpense = sum(incomes.map((l) => l.expense))
  const elderlyExemption = profile.elderlyOrDisabled ? Math.min(rules.elderlyExemption, totalIncome - totalExpense) : 0
  const incomeAfterExpenses = Math.max(0, totalIncome - totalExpense - elderlyExemption)

  // 2) ค่าลดหย่อน
  const r = rules.deductions
  const lines: DeductionLine[] = []
  const add = (line: DeductionLine) => {
    if (line.claimed > 0 || line.allowed > 0) lines.push({ ...line, allowed: round2(line.allowed) })
  }

  add({ id: 'personal', label: 'ส่วนตัว', group: 'family', claimed: r.personal, allowed: r.personal })
  if (profile.married && !profile.spouseHasIncome) {
    add({ id: 'spouse', label: 'คู่สมรส (ไม่มีเงินได้)', group: 'family', claimed: r.spouse, allowed: r.spouse })
  }
  const childAmounts = d.children.map((year, i) => (i > 0 && year >= 2561 ? r.childSecondPlusBornFrom2561 : r.child))
  if (childAmounts.length) {
    const bonus = childAmounts.filter((a) => a === r.childSecondPlusBornFrom2561 && a !== r.child).length
    add({
      id: 'children',
      label: `บุตร ${childAmounts.length} คน`,
      group: 'family',
      claimed: sum(childAmounts),
      allowed: sum(childAmounts),
      note: bonus ? `บุตรคนที่ 2 ขึ้นไปที่เกิดตั้งแต่ปี 2561 ได้คนละ ${r.childSecondPlusBornFrom2561.toLocaleString()} บาท` : undefined,
    })
  }
  const parents = Math.min(d.parents, 4)
  add({ id: 'parents', label: `อุปการะบิดามารดา ${parents} คน`, group: 'family', claimed: parents * r.parent, allowed: parents * r.parent })
  add({ id: 'disabledCare', label: `อุปการะผู้พิการ/ทุพพลภาพ ${d.disabledCare} คน`, group: 'family', claimed: d.disabledCare * r.disabledCare, allowed: d.disabledCare * r.disabledCare })
  add({ id: 'prenatal', label: 'ฝากครรภ์และคลอดบุตร', group: 'family', claimed: d.prenatal, allowed: clamp(d.prenatal, r.prenatal) })

  add({ id: 'socialSecurity', label: 'เงินสมทบประกันสังคม', group: 'insurance', claimed: d.socialSecurity, allowed: clamp(d.socialSecurity, r.socialSecurity) })

  // ประกันชีวิต + สุขภาพ รวมกันไม่เกินเพดาน
  const life = clamp(d.lifeInsurance, r.lifeInsurance)
  const health = Math.min(clamp(d.healthInsurance, r.healthInsurance), Math.max(0, r.lifeHealthCombined - life))
  add({ id: 'lifeInsurance', label: 'เบี้ยประกันชีวิต', group: 'insurance', claimed: d.lifeInsurance, allowed: life })
  add({
    id: 'healthInsurance',
    label: 'เบี้ยประกันสุขภาพตนเอง',
    group: 'insurance',
    claimed: d.healthInsurance,
    allowed: health,
    note: health < clamp(d.healthInsurance, r.healthInsurance) ? `รวมกับประกันชีวิตแล้วต้องไม่เกิน ${r.lifeHealthCombined.toLocaleString()} บาท` : undefined,
  })
  if (profile.married && !profile.spouseHasIncome) {
    add({ id: 'spouseLifeInsurance', label: 'เบี้ยประกันชีวิตคู่สมรส', group: 'insurance', claimed: d.spouseLifeInsurance, allowed: clamp(d.spouseLifeInsurance, r.spouseLifeInsurance) })
  }
  add({ id: 'parentHealthInsurance', label: 'เบี้ยประกันสุขภาพบิดามารดา', group: 'insurance', claimed: d.parentHealthInsurance, allowed: clamp(d.parentHealthInsurance, r.parentHealthInsurance) })

  // กลุ่มเกษียณ (รวมกันไม่เกิน retirementCombined)
  const pensionCap = Math.min(totalIncome * r.pensionInsurance.rate, r.pensionInsurance.max)
  const pensionInBucket = clamp(d.pensionInsurance, pensionCap)
  // เบี้ยบำนาญส่วนที่เกิน ย้ายไปใช้สิทธิประกันชีวิตที่เหลือได้
  const lifeRoom = Math.max(0, Math.min(r.lifeInsurance - life, r.lifeHealthCombined - life - health))
  const pensionOverflow = Math.min(Math.max(0, d.pensionInsurance - pensionInBucket), lifeRoom)

  const retirement = {
    pvd: clamp(d.pvd, Math.min(income.salary * r.pvd.rate, r.pvd.max)),
    gpf: clamp(d.gpf, Math.min(income.salary * r.gpf.rate, r.gpf.max)),
    pension: pensionInBucket,
    nsf: clamp(d.nsf, r.nsf),
    ssf: r.ssf ? clamp(d.ssf, Math.min(totalIncome * r.ssf.rate, r.ssf.max)) : 0,
    rmf: clamp(d.rmf, Math.min(totalIncome * r.rmf.rate, r.rmf.max)),
  }
  let over = sum(Object.values(retirement)) - r.retirementCombined
  const retirementCut = over > 0
  for (const key of ['rmf', 'ssf', 'nsf', 'pension', 'gpf', 'pvd'] as const) {
    if (over <= 0) break
    const cut = Math.min(retirement[key], over)
    retirement[key] -= cut
    over -= cut
  }
  const capNote = retirementCut ? `กลุ่มเกษียณรวมกันต้องไม่เกิน ${r.retirementCombined.toLocaleString()} บาท` : undefined
  add({
    id: 'pensionInsurance',
    label: 'เบี้ยประกันชีวิตแบบบำนาญ',
    group: 'saving',
    claimed: d.pensionInsurance,
    allowed: retirement.pension + pensionOverflow,
    note: pensionOverflow > 0 ? `ใช้สิทธิประกันชีวิตที่เหลือ ${pensionOverflow.toLocaleString()} บาท` : undefined,
  })
  add({ id: 'pvd', label: 'กองทุนสำรองเลี้ยงชีพ (PVD)', group: 'saving', claimed: d.pvd, allowed: retirement.pvd, note: capNote })
  add({ id: 'gpf', label: 'กบข. / กองทุนสงเคราะห์ครูเอกชน', group: 'saving', claimed: d.gpf, allowed: retirement.gpf, note: capNote })
  add({ id: 'nsf', label: 'กองทุนการออมแห่งชาติ (กอช.)', group: 'saving', claimed: d.nsf, allowed: retirement.nsf })
  if (r.ssf) add({ id: 'ssf', label: 'กองทุน SSF', group: 'saving', claimed: d.ssf, allowed: retirement.ssf, note: capNote })
  else if (d.ssf > 0) warnings.push(`ปีภาษี ${rules.taxYear} ใช้ SSF ลดหย่อนไม่ได้แล้ว`)
  add({ id: 'rmf', label: 'กองทุน RMF', group: 'saving', claimed: d.rmf, allowed: retirement.rmf, note: capNote })
  if (r.thaiEsg) {
    add({ id: 'thaiEsg', label: 'กองทุน ThaiESG / ThaiESGX (เงินใหม่)', group: 'saving', claimed: d.thaiEsg, allowed: clamp(d.thaiEsg, Math.min(totalIncome * r.thaiEsg.rate, r.thaiEsg.max)) })
  }
  if (r.thaiEsgxLtf > 0) {
    add({ id: 'thaiEsgxLtf', label: 'ThaiESGX (สับเปลี่ยนจาก LTF)', group: 'saving', claimed: d.thaiEsgxLtf, allowed: clamp(d.thaiEsgxLtf, r.thaiEsgxLtf) })
  }

  add({ id: 'homeLoanInterest', label: 'ดอกเบี้ยเงินกู้ซื้อที่อยู่อาศัย', group: 'other', claimed: d.homeLoanInterest, allowed: clamp(d.homeLoanInterest, r.homeLoanInterest) })
  add({ id: 'socialEnterprise', label: 'ลงทุนในวิสาหกิจเพื่อสังคม', group: 'other', claimed: d.socialEnterprise, allowed: clamp(d.socialEnterprise, r.socialEnterprise) })
  add({ id: 'politicalDonation', label: 'บริจาคพรรคการเมือง', group: 'other', claimed: d.politicalDonation, allowed: clamp(d.politicalDonation, r.politicalDonation) })

  for (const m of rules.measures) {
    const values = input.measures[m.id]
    const claimed = sum(Object.values(values ?? {}).map((v) => v || 0))
    add({ id: `measure:${m.id}`, label: m.label, group: 'measure', claimed, allowed: measureDeduction(m, values) })
  }

  for (const line of lines) {
    if (line.claimed > line.allowed && !line.note && line.group !== 'family') {
      line.note = `เกินสิทธิ ${round2(line.claimed - line.allowed).toLocaleString()} บาท ส่วนที่เกินนำมาลดหย่อนไม่ได้`
    }
  }

  // 3) เงินบริจาค (คำนวณหลังหักค่าลดหย่อนอื่นแล้ว)
  const beforeDonation = Math.max(0, incomeAfterExpenses - sum(lines.map((l) => l.allowed)))
  const eduAllowed = Math.min(d.donationEducation * 2, beforeDonation * r.donationCapRate)
  add({
    id: 'donationEducation',
    label: 'บริจาคการศึกษา/กีฬา/โรงพยาบาลรัฐ (2 เท่า)',
    group: 'donation',
    claimed: d.donationEducation,
    allowed: eduAllowed,
    note: d.donationEducation > 0 ? `หักได้ 2 เท่า แต่ไม่เกิน ${r.donationCapRate * 100}% ของเงินได้หลังหักลดหย่อน` : undefined,
  })
  const genAllowed = Math.min(d.donationGeneral, (beforeDonation - eduAllowed) * r.donationCapRate)
  add({
    id: 'donationGeneral',
    label: 'บริจาคทั่วไป',
    group: 'donation',
    claimed: d.donationGeneral,
    allowed: genAllowed,
    note: genAllowed < d.donationGeneral ? `ไม่เกิน ${r.donationCapRate * 100}% ของเงินได้หลังหักลดหย่อน` : undefined,
  })

  const totalDeductions = round2(sum(lines.map((l) => l.allowed)))
  const netIncome = round2(Math.max(0, incomeAfterExpenses - totalDeductions))

  // 4) ภาษี: วิธีขั้นบันได เทียบกับวิธี 0.5% (ถ้าเข้าเงื่อนไข) แล้วใช้ยอดที่สูงกว่า
  const prog = progressiveTax(netIncome, rules)
  const nonSalaryIncome = totalIncome - income.salary
  let minimumTax: number | null = null
  if (nonSalaryIncome >= rules.minimumTax.incomeThreshold) {
    const m = round2(nonSalaryIncome * rules.minimumTax.rate)
    minimumTax = m > rules.minimumTax.exemptIfNotExceed ? m : 0
  }
  const usedMinimumTax = minimumTax !== null && minimumTax > prog.tax
  const tax = usedMinimumTax ? minimumTax! : prog.tax
  const credits = round2((input.credits.withheld || 0) + (input.credits.prepaid || 0) + dividendCredit + investmentWithheld)

  return {
    incomes,
    totalIncome,
    elderlyExemption,
    totalExpense: round2(totalExpense),
    incomeAfterExpenses: round2(incomeAfterExpenses),
    deductions: lines,
    totalDeductions,
    netIncome,
    brackets: prog.lines,
    progressiveTax: prog.tax,
    minimumTax,
    usedMinimumTax,
    tax,
    dividendCredit,
    investmentWithheld,
    credits,
    balance: round2(tax - credits),
    effectiveRate: totalIncome > 0 ? tax / totalIncome : 0,
    marginalRate: marginalRate(netIncome, rules),
    warnings,
  }
}
