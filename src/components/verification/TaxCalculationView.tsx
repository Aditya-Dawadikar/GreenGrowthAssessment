import { useState } from "react";
import { Check, CheckCircle2, Loader2, MoveRight, ScrollText, Sigma } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTimestamp } from "@/lib/format";
import { computeTaxSummary, TAX_SCHEME } from "@/lib/tax-calculations";
import { useTaxReturn } from "@/state/tax-return-store";
import type { TaxField } from "@/types/tax-return";

/**
 * Full-tab tax calculation view. Every total recomputes live off
 * `current_state.value`, so it always reflects the working state even before
 * a field is locked. Each card shows the symbolic formula and the numeric
 * expression it evaluated, plus a "Derived from" lineage list — click any
 * raw-field entry to jump straight to it (and, via selectField, its source
 * document bounding box on the left), tracing the number all the way back to
 * where it came from. Submitting records an auditable snapshot (which scheme
 * was applied, the resulting totals and formulas, who/when) in the store.
 */
export function TaxCalculationView({
  fields,
  clientId,
  onFieldSelected,
}: {
  fields: TaxField[];
  clientId: string;
  onFieldSelected?: () => void;
}) {
  const { selectField, submitTaxCalculation, taxSubmissions } = useTaxReturn();
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "submitted">("idle");
  const summary = computeTaxSummary(fields, clientId);
  const lastSubmission = taxSubmissions[clientId] ?? null;

  if (summary.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-slate-400">
        <Sigma className="size-8" />
        <p className="text-sm">No income or withholding fields found for this client yet.</p>
      </div>
    );
  }

  function jumpTo(fieldId: string) {
    selectField(fieldId);
    onFieldSelected?.();
  }

  function handleSubmit() {
    submitTaxCalculation(clientId, summary);
    setSubmitState("submitting");
    window.setTimeout(() => {
      setSubmitState("submitted");
      window.setTimeout(() => setSubmitState("idle"), 1500);
    }, 500);
  }

  const submitIcon =
    submitState === "submitting" ? (
      <Loader2 className="size-3.5 animate-spin" />
    ) : submitState === "submitted" ? (
      <Check className="size-3.5" />
    ) : null;
  const submitLabel =
    submitState === "submitting" ? "Submitting…" : submitState === "submitted" ? "Submitted" : "Submit Calculation";

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 px-3 py-2">
        <ScrollText className="size-3.5 shrink-0 text-slate-400" />
        <span className="text-xs font-medium text-slate-700">{TAX_SCHEME.name}</span>
        <Badge variant="outline" className="h-5 shrink-0 px-1.5 font-mono text-[10px] font-normal text-slate-500">
          {TAX_SCHEME.id}
        </Badge>
        <span className="text-[10px] text-slate-400">{TAX_SCHEME.description}</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
          {summary.map((calc) => (
            <div key={calc.calc_id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
              

              <div className="border-t border-slate-100 pt-2">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Derived from</p>
                <ul className="space-y-1">
                  {calc.lineage.map((entry) => (
                    <li key={`${entry.kind}_${entry.fieldId ?? entry.label}`}>
                      {entry.fieldId ? (
                        <button
                          type="button"
                          onClick={() => jumpTo(entry.fieldId!)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-indigo-50"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-slate-700">{entry.label}</span>
                            {entry.subtext && (
                              <span className="block truncate text-[10px] text-slate-400">{entry.subtext}</span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono tabular-nums text-slate-900">{entry.value}</span>
                          <MoveRight className="size-3 shrink-0 text-indigo-500" />
                        </button>
                      ) : (
                        <div className="flex items-center justify-between gap-2 px-1.5 py-1 text-xs text-slate-600">
                          <span className="min-w-0 flex-1 truncate">Σ {entry.label}</span>
                          <span className="shrink-0 font-mono tabular-nums">{entry.value}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">{calc.label}</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-slate-900">
                  {calc.formattedValue}
                </span>
              </div>

              <div className="rounded-md bg-slate-50 px-2 py-1.5">
                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Formula</p>
                <p className="font-mono text-[11px] text-slate-700">{calc.formula}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400" title={calc.expression}>
                  {calc.expression}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 px-3 py-2">
        {lastSubmission ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-emerald-700">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span className="truncate">
              Submitted {formatTimestamp(lastSubmission.submitted_at)} by {lastSubmission.user_display_name} ·{" "}
              {lastSubmission.scheme_id}
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Not yet submitted for this client.</span>
        )}
        <Button
          size="sm"
          className="ml-auto h-7 shrink-0 px-3 text-xs"
          onClick={handleSubmit}
          disabled={submitState !== "idle"}
        >
          {submitIcon}
          {submitLabel}
        </Button>
      </div>
    </>
  );
}
