import { describe, expect, it } from "vitest";
import { computeTaxSummary, formatCurrency, parseCurrency, TAX_SCHEME } from "@/lib/tax-calculations";
import type { TaxField } from "@/types/tax-return";

const CLIENT_ID = "client_a";

function makeField(fieldId: string, label: string, value: string, docId = "w2_acme_2025"): TaxField {
  return {
    field_id: `${CLIENT_ID}__${fieldId}`,
    client_id: CLIENT_ID,
    label,
    ai_ground_truth: {
      value,
      confidence: 0.9,
      model: "test-model",
      extracted_at: "2026-07-23T09:42:00Z",
      doc_source: { doc_id: docId, doc_name: `${docId}.pdf`, page: 1, bbox: { x: 0, y: 0, width: 1, height: 1 } },
    },
    current_state: { value, status: "ai_extracted" },
    event_history: [
      {
        event_id: "evt_1",
        parent_id: null,
        type: "AI_EXTRACTED",
        value,
        user_id: "system_ai_v2.4",
        timestamp: "2026-07-23T09:42:00Z",
      },
    ],
  };
}

const FIELDS: TaxField[] = [
  makeField("line_1a_wages", "Line 1a: Wages", "$125,000.00"),
  makeField("misc_box1_rents", "Box 1: Rents", "$2,400.00", "misc_acme_2025"),
  makeField("misc_box3_other_income", "Box 3: Other income", "$500.00", "misc_acme_2025"),
  makeField("line_2_fed_withheld", "Line 2: Federal withheld", "$18,750.00"),
  makeField("line_4_ss_withheld", "Line 4: SS withheld", "$7,750.00"),
  makeField("w2_box6_medicare_withheld", "Box 6: Medicare withheld", "$1,812.50"),
  makeField("line_7_state_withheld", "Line 7: State withheld", "$1,200.00"),
  makeField("misc_box4_fed_withheld", "Box 4: Federal withheld", "$0.00", "misc_acme_2025"),
];

describe("parseCurrency", () => {
  it("strips currency formatting and returns a number", () => {
    expect(parseCurrency("$125,000.00")).toBe(125000);
    expect(parseCurrency("$0.00")).toBe(0);
  });

  it("falls back to 0 for unparsable input", () => {
    expect(parseCurrency("")).toBe(0);
    expect(parseCurrency("n/a")).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("formats a number as USD currency", () => {
    expect(formatCurrency(125000)).toBe("$125,000.00");
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("computeTaxSummary", () => {
  it("sums income fields into Total Income", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const totalIncome = summary.find((c) => c.calc_id === "calc_total_income")!;
    expect(totalIncome.value).toBeCloseTo(125000 + 2400 + 500);
    expect(totalIncome.formattedValue).toBe(formatCurrency(127900));
  });

  it("sums withholding fields into Total Tax Withheld", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const totalWithholding = summary.find((c) => c.calc_id === "calc_total_withholding")!;
    expect(totalWithholding.value).toBeCloseTo(18750 + 7750 + 1812.5 + 1200 + 0);
  });

  it("derives Estimated Tax from Total Income at the flat rate", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const totalIncome = summary.find((c) => c.calc_id === "calc_total_income")!;
    const estimatedTax = summary.find((c) => c.calc_id === "calc_estimated_tax")!;
    expect(estimatedTax.value).toBeCloseTo(totalIncome.value * 0.22);
  });

  it("labels the balance a refund when withholding exceeds estimated tax", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const balance = summary.find((c) => c.calc_id === "calc_balance")!;
    // 29512.50 withheld vs 28138 estimated tax -> refund
    expect(balance.label).toBe("Estimated Refund");
    expect(balance.value).toBeGreaterThan(0);
  });

  it("labels the balance a balance due when estimated tax exceeds withholding", () => {
    const lowWithholding = FIELDS.map((f) =>
      f.field_id === `${CLIENT_ID}__line_2_fed_withheld`
        ? { ...f, current_state: { value: "$0.00", status: "user_modified" as const } }
        : f,
    );
    const balance = computeTaxSummary(lowWithholding, CLIENT_ID).find((c) => c.calc_id === "calc_balance")!;
    expect(balance.label).toBe("Estimated Balance Due");
  });

  it("reads live current_state.value, not the AI ground truth, so edits recompute the total", () => {
    const edited = FIELDS.map((f) =>
      f.field_id === `${CLIENT_ID}__line_1a_wages`
        ? { ...f, current_state: { value: "$200,000.00", status: "user_modified" as const } }
        : f,
    );
    const totalIncome = computeTaxSummary(edited, CLIENT_ID).find((c) => c.calc_id === "calc_total_income")!;
    expect(totalIncome.value).toBeCloseTo(200000 + 2400 + 500);
  });

  it("builds field-level lineage entries with the plain field name and a doc:ref subtext", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const totalIncome = summary.find((c) => c.calc_id === "calc_total_income")!;
    const wagesEntry = totalIncome.lineage.find((l) => l.fieldId === `${CLIENT_ID}__line_1a_wages`);
    expect(wagesEntry).toBeDefined();
    expect(wagesEntry?.kind).toBe("field");
    // Source label is "Line 1a: Wages" — the ref ("Line 1a") moves into the
    // subtext alongside the document name, leaving just the field name up front.
    expect(wagesEntry?.label).toBe("Wages");
    expect(wagesEntry?.subtext).toBe("w2_acme_2025.pdf:Line 1a");
  });

  it("builds calculated-level lineage entries for totals derived from other totals", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const estimatedTax = summary.find((c) => c.calc_id === "calc_estimated_tax")!;
    expect(estimatedTax.lineage).toEqual([
      { label: "Total Income", value: formatCurrency(127900), kind: "calculated" },
    ]);
  });

  it("returns an empty summary when the client has none of the relevant fields", () => {
    expect(computeTaxSummary(FIELDS, "client_unknown")).toEqual([]);
  });

  it("skips missing fields without throwing when only some inputs are present", () => {
    const partial = FIELDS.filter((f) => f.field_id === `${CLIENT_ID}__line_1a_wages`);
    const summary = computeTaxSummary(partial, CLIENT_ID);
    const totalIncome = summary.find((c) => c.calc_id === "calc_total_income")!;
    expect(totalIncome.value).toBe(125000);
    expect(totalIncome.lineage).toHaveLength(1);
  });

  it("falls back to the whole label when a field label has no ref prefix", () => {
    const noRefField = makeField("line_1a_wages", "Wages", "$125,000.00");
    const summary = computeTaxSummary([noRefField], CLIENT_ID);
    const wagesEntry = summary.find((c) => c.calc_id === "calc_total_income")!.lineage[0];
    expect(wagesEntry.label).toBe("Wages");
    expect(wagesEntry.subtext).toBe("w2_acme_2025.pdf:Wages");
  });

  it("builds a symbolic formula and a numeric expression for a summed total", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const totalIncome = summary.find((c) => c.calc_id === "calc_total_income")!;
    expect(totalIncome.formula).toBe("Wages + Rents + Other income");
    expect(totalIncome.expression).toBe("$125,000.00 + $2,400.00 + $500.00 = $127,900.00");
  });

  it("builds a formula referencing Total Income for the flat-rate Estimated Tax", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const estimatedTax = summary.find((c) => c.calc_id === "calc_estimated_tax")!;
    expect(estimatedTax.formula).toBe("Total Income × 22%");
    expect(estimatedTax.expression).toBe("$127,900.00 × 22% = $28,138.00");
  });

  it("builds a subtraction formula for the balance total", () => {
    const summary = computeTaxSummary(FIELDS, CLIENT_ID);
    const balance = summary.find((c) => c.calc_id === "calc_balance")!;
    expect(balance.formula).toBe("Total Tax Withheld − Estimated Tax");
    expect(balance.expression).toBe("$29,512.50 − $28,138.00 = $1,374.50");
  });
});

describe("TAX_SCHEME", () => {
  it("identifies which calculation policy was applied", () => {
    expect(TAX_SCHEME.id).toBe("us_1040_2025_flat22");
    expect(TAX_SCHEME.name).toContain("1040");
    expect(TAX_SCHEME.description).toContain("22%");
  });
});
