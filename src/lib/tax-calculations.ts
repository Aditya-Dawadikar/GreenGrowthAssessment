import type { TaxField } from "@/types/tax-return";

export function parseCurrency(value: string): number {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Flat-rate stand-in for a real bracket calculation — kept intentionally simple. */
export const FLAT_TAX_RATE = 0.22;

/**
 * Identifies which calculation policy produced a submitted result. There's
 * only one scheme today (a flat-rate estimate, not a real IRS bracket
 * calculation), but naming it explicitly means a submission always records
 * which rules were applied, and a future bracketed/state-specific scheme can
 * be added without breaking old submissions.
 */
export const TAX_SCHEME = {
  id: "us_1040_2025_flat22",
  name: "US Form 1040 (2025) — Flat-Rate Estimate",
  description: `Simplified single flat ${Math.round(FLAT_TAX_RATE * 100)}% federal rate applied to total income; not a bracketed IRS calculation.`,
} as const;

export interface LineageEntry {
  label: string;
  /** e.g. "2025_W2_AcmeCorp.pdf:Line 1a" — present for kind "field". */
  subtext?: string;
  value: string;
  kind: "field" | "calculated";
  /** Present for kind "field" — lets the UI jump to (and highlight) the source field. */
  fieldId?: string;
}

/**
 * Field labels follow a "<ref>: <name>" convention (e.g. "Line 1a: Wages,
 * tips, other comp."). Splits the two apart so lineage can show the plain
 * field name up front and the ref/doc as a secondary trace-back hint.
 */
function parseFieldLabel(label: string): { ref: string; name: string } {
  const idx = label.indexOf(": ");
  return idx === -1 ? { ref: label, name: label } : { ref: label.slice(0, idx), name: label.slice(idx + 2) };
}

export interface CalculatedField {
  calc_id: string;
  label: string;
  value: number;
  formattedValue: string;
  /** Symbolic formula, e.g. "Wages, tips, other comp. + Rents + Other income". */
  formula: string;
  /** Same formula with actual values substituted in, e.g. "$125,000.00 + $2,400.00 + $500.00 = $127,900.00". */
  expression: string;
  lineage: LineageEntry[];
}

/** A finalized, auditable record of one submitted tax calculation run. */
export interface TaxCalculationSubmission {
  submission_id: string;
  client_id: string;
  scheme_id: string;
  scheme_name: string;
  submitted_at: string;
  user_id: string;
  user_display_name: string;
  totals: Array<Pick<CalculatedField, "calc_id" | "label" | "formattedValue" | "formula" | "expression">>;
}

const INCOME_FIELD_IDS = ["line_1a_wages", "misc_box1_rents", "misc_box3_other_income"];

const WITHHOLDING_FIELD_IDS = [
  "line_2_fed_withheld",
  "line_4_ss_withheld",
  "w2_box6_medicare_withheld",
  "line_7_state_withheld",
  "misc_box4_fed_withheld",
];

function sumFields(
  fields: TaxField[],
  baseFieldIds: string[],
  clientId: string,
): { total: number; lineage: LineageEntry[] } {
  const lineage: LineageEntry[] = [];
  let total = 0;

  for (const baseId of baseFieldIds) {
    const field = fields.find((f) => f.field_id === `${clientId}__${baseId}`);
    if (!field) continue;
    total += parseCurrency(field.current_state.value);
    const { ref, name } = parseFieldLabel(field.label);
    lineage.push({
      label: name,
      subtext: `${field.ai_ground_truth.doc_source.doc_name}:${ref}`,
      value: field.current_state.value,
      kind: "field",
      fieldId: field.field_id,
    });
  }

  return { total, lineage };
}

/**
 * Computes a small set of derived totals for a client, each carrying its own
 * lineage back to either raw source fields or other calculated totals, so
 * the UI can trace a number all the way back to the document it came from.
 */
export function computeTaxSummary(fields: TaxField[], clientId: string): CalculatedField[] {
  const income = sumFields(fields, INCOME_FIELD_IDS, clientId);
  const withholding = sumFields(fields, WITHHOLDING_FIELD_IDS, clientId);

  if (income.lineage.length === 0 && withholding.lineage.length === 0) return [];

  const estimatedTax = income.total * FLAT_TAX_RATE;
  const balance = withholding.total - estimatedTax;

  const ratePct = Math.round(FLAT_TAX_RATE * 100);

  const totalIncome: CalculatedField = {
    calc_id: "calc_total_income",
    label: "Total Income",
    value: income.total,
    formattedValue: formatCurrency(income.total),
    formula: income.lineage.map((l) => l.label).join(" + ") || "—",
    expression: `${income.lineage.map((l) => l.value).join(" + ")} = ${formatCurrency(income.total)}`,
    lineage: income.lineage,
  };

  const totalWithholding: CalculatedField = {
    calc_id: "calc_total_withholding",
    label: "Total Tax Withheld",
    value: withholding.total,
    formattedValue: formatCurrency(withholding.total),
    formula: withholding.lineage.map((l) => l.label).join(" + ") || "—",
    expression: `${withholding.lineage.map((l) => l.value).join(" + ")} = ${formatCurrency(withholding.total)}`,
    lineage: withholding.lineage,
  };

  const estimatedTaxField: CalculatedField = {
    calc_id: "calc_estimated_tax",
    label: `Estimated Tax (${ratePct}% flat rate)`,
    value: estimatedTax,
    formattedValue: formatCurrency(estimatedTax),
    formula: `Total Income × ${ratePct}%`,
    expression: `${totalIncome.formattedValue} × ${ratePct}% = ${formatCurrency(estimatedTax)}`,
    lineage: [{ label: totalIncome.label, value: totalIncome.formattedValue, kind: "calculated" }],
  };

  const balanceField: CalculatedField = {
    calc_id: "calc_balance",
    label: balance >= 0 ? "Estimated Refund" : "Estimated Balance Due",
    value: Math.abs(balance),
    formattedValue: formatCurrency(Math.abs(balance)),
    formula: "Total Tax Withheld − Estimated Tax",
    expression: `${totalWithholding.formattedValue} − ${estimatedTaxField.formattedValue} = ${balance >= 0 ? "" : "−"}${formatCurrency(Math.abs(balance))}`,
    lineage: [
      { label: totalWithholding.label, value: totalWithholding.formattedValue, kind: "calculated" },
      { label: estimatedTaxField.label, value: estimatedTaxField.formattedValue, kind: "calculated" },
    ],
  };

  return [totalIncome, totalWithholding, estimatedTaxField, balanceField];
}
