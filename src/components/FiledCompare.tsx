import { useState } from "react";
import type { TaxResult } from "../engine/types";
import {
  compareWithFiled,
  type FiledFigures,
  type FiledRow,
} from "../lib/filing";
import { fmt } from "../lib/format";
import { useT } from "../lib/lang";
import { IconTile } from "./icons";
import { MoneyField } from "./ui";

/** ช่องกรอกตัวเลขจากแบบที่ยื่นแล้ว แล้วเทียบกับที่แอปคำนวณ — ไม่บันทึกไว้ เปิดหน้าใหม่ต้องกรอกใหม่ */
export function FiledCompare({
  result,
  onFeedback,
}: {
  result: TaxResult;
  onFeedback?: () => void;
}) {
  const t = useT();
  const [values, setValues] = useState<FiledFigures>({});
  const [typed, setTyped] = useState<Partial<Record<keyof FiledFigures, true>>>(
    {},
  );

  const put = (key: keyof FiledFigures) => (v: number) => {
    setValues((x) => ({ ...x, [key]: v }));
    setTyped((x) => ({ ...x, [key]: true }));
  };
  // เทียบเฉพาะช่องที่ผู้ใช้แตะแล้ว ช่องที่ยังว่างจะไม่ถูกนับเป็น 0
  const entered: FiledFigures = {
    netIncome: typed.netIncome ? values.netIncome : undefined,
    tax: typed.tax ? values.tax : undefined,
    refund: typed.refund ? values.refund : undefined,
    due: typed.due ? values.due : undefined,
  };
  const rows = compareWithFiled(result, entered);
  const allMatch = rows.length > 0 && rows.every((r) => r.match);
  const someMismatch = rows.some((r) => !r.match);

  const label = (r: FiledRow) => {
    if (r.key === "netIncome") return t("เงินได้สุทธิ", "Net taxable income");
    if (r.key === "tax") return t("ภาษีทั้งปี", "Annual tax");
    return t("ได้คืน / จ่ายเพิ่ม", "Refund / amount due");
  };
  const money = (r: FiledRow, n: number) => {
    if (r.key !== "balance") return `฿${fmt(n)}`;
    if (Math.abs(n) < 0.005) return t("ไม่ต้องจ่ายเพิ่ม", "Nothing due");
    return n < 0
      ? t(`ได้คืน ฿${fmt(-n)}`, `Refund ฿${fmt(-n)}`)
      : t(`จ่ายเพิ่ม ฿${fmt(n)}`, `Due ฿${fmt(n)}`);
  };

  return (
    <section className="card flex flex-col gap-4 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <IconTile name="receipt" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            {t("เทียบกับแบบที่ยื่นแล้ว", "Compare with what you filed")}
          </h2>
          <p className="text-sm text-muted">
            {t(
              "กรอกจากแบบ ภ.ง.ด.90/91 ที่ยื่นไปแล้ว หรือหน้าสรุปใน e-Filing เพื่อดูว่าตรงกับที่แอปคำนวณไหม",
              "Enter the figures from the ภ.ง.ด.90/91 you filed, or the e-Filing summary, to check them against the app.",
            )}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <MoneyField
            id="fc-net"
            label={t(
              "เงินได้สุทธิในแบบที่ยื่น",
              "Net taxable income on your form",
            )}
            value={values.netIncome ?? 0}
            onChange={put("netIncome")}
          />
        </div>
        <div className="min-w-0">
          <MoneyField
            id="fc-tax"
            label={t("ภาษีทั้งปีในแบบที่ยื่น", "Annual tax on your form")}
            value={values.tax ?? 0}
            onChange={put("tax")}
          />
        </div>
        <div className="min-w-0">
          <MoneyField
            id="fc-refund"
            label={t("ยอดที่ได้คืน (ถ้ามี)", "Refund received (if any)")}
            value={values.refund ?? 0}
            onChange={put("refund")}
          />
        </div>
        <div className="min-w-0">
          <MoneyField
            id="fc-due"
            label={t("ยอดที่จ่ายเพิ่ม (ถ้ามี)", "Amount paid extra (if any)")}
            value={values.due ?? 0}
            onChange={put("due")}
          />
        </div>
      </div>

      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-2xl bg-paper">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-1 px-3 py-3">
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold">{label(r)}</span>
                <span
                  className={`text-sm font-semibold ${r.match ? "text-refund" : "text-due"}`}
                >
                  {r.match
                    ? `✓ ${t("ตรง", "Match")}`
                    : `✕ ${t(`ต่างกัน ฿${fmt(Math.abs(r.diff))}`, `Differs by ฿${fmt(Math.abs(r.diff))}`)}`}
                </span>
              </span>
              <span className="num grid grid-cols-2 gap-2 text-sm text-muted">
                <span>
                  {t("แอปคำนวณ", "App")}:{" "}
                  <b className="text-ink">{money(r, r.ours)}</b>
                </span>
                <span>
                  {t("แบบที่ยื่น", "Filed")}:{" "}
                  <b className="text-ink">{money(r, r.filed)}</b>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {allMatch && (
        <p className="rounded-2xl bg-refund-soft px-4 py-3 text-sm text-refund">
          {t("ตรงกันทุกรายการที่กรอก", "Everything you entered matches.")}
        </p>
      )}
      {someMismatch && (
        <div className="flex flex-col gap-2 rounded-2xl bg-due-soft px-4 py-3 text-sm text-due">
          <p>
            {t(
              "มีรายการไม่ตรง ลองตรวจว่ากรอกครบตามเอกสารไหม ถ้ายังไม่ตรง แจ้งเราได้ โดยระบบจะแนบตัวเลขที่แอปคำนวณให้ด้วย",
              "Some figures differ. Check that the numbers match your documents. If they still differ, tell us. The app will attach its calculation.",
            )}
          </p>
          {onFeedback && !__PREVIEW__ && (
            <button
              type="button"
              onClick={onFeedback}
              className="self-start rounded-xl bg-surface px-3 py-2 font-semibold text-due"
            >
              {t("แจ้งตัวเลขไม่ตรง", "Report a mismatch")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
