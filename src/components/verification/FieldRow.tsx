import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CONFIDENCE_TIER_CLASSES, confidenceTier } from "@/lib/confidence";
import { ReasoningPopover } from "@/components/verification/ReasoningPopover";
import { MutationPill } from "@/components/verification/MutationPill";
import { mutationCount, useTaxReturn } from "@/state/tax-return-store";
import type { TaxField } from "@/types/tax-return";

const STATUS_BADGE: Record<TaxField["current_state"]["status"], { label: string; className: string }> = {
  ai_extracted: { label: "AI Extracted", className: "bg-slate-100 text-slate-600 border-slate-200" },
  user_modified: { label: "User Modified", className: "bg-blue-50 text-blue-700 border-blue-200" },
  locked: { label: "Locked", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function FieldRow({ field }: { field: TaxField }) {
  const {
    selectedFieldId,
    checkedFieldIds,
    confidenceThresholds,
    selectField,
    updateValue,
    lockField,
    unlockField,
    toggleFieldChecked,
    openLedger,
  } = useTaxReturn();

  const isSelected = selectedFieldId === field.field_id;
  const isChecked = checkedFieldIds.includes(field.field_id);
  const tier = confidenceTier(field.ai_ground_truth.confidence, confidenceThresholds);
  const status = field.current_state.status;
  const isLocked = status === "locked";
  const badge = STATUS_BADGE[status];

  return (
    <div
      data-field-id={field.field_id}
      className={cn(
        "border-b border-slate-100 px-3 py-2.5 transition-colors",
        isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50",
      )}
    >
      {/* Label sits above the data row, indented to line up with the AI
          Extracted column (checkbox column width + gap) rather than the
          checkbox itself. */}
      <div
        onClick={() => selectField(field.field_id)}
        className="mb-1.5 ml-6 flex cursor-pointer items-center gap-1.5"
      >
        <span className="text-[11px] font-medium text-slate-600">{field.label}</span>
        <ReasoningPopover groundTruth={field.ai_ground_truth} />
      </div>

      {/* Grid mirrors the header's column template so the checkbox lines up
          with the header checkbox and the AI Extracted / Working State
          boxes, rather than with the label line above. */}
      <div className="grid grid-cols-[1rem_1fr_1fr_6rem_auto] items-center gap-2">
        <Checkbox
          checked={isChecked}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => toggleFieldChecked(field.field_id)}
          aria-label={`Select ${field.label} for bulk lock/unlock`}
        />

        {/* Selection is scoped to these two boxes (not the row as a whole) so it
            never competes with the mutation pill, which sits between them at
            the row's geometric center — a row-wide click handler would make
            clicking near the middle of a row open the ledger drawer instead
            of just selecting the field. */}
        <div
          onClick={() => selectField(field.field_id)}
          className={cn(
            "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs",
            CONFIDENCE_TIER_CLASSES[tier],
          )}
          title={`${Math.round(field.ai_ground_truth.confidence * 100)}% confidence`}
        >
          <span className="truncate font-mono tabular-nums">{field.ai_ground_truth.value}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] opacity-70">
            {Math.round(field.ai_ground_truth.confidence * 100)}%
          </span>
        </div>

        <div
          onClick={() => selectField(field.field_id)}
          className={cn(
            "flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-1 text-xs",
            isLocked
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
              : status === "user_modified"
                ? "border-blue-400 bg-blue-50/20 text-blue-950"
                : "cursor-pointer border-slate-300 bg-white focus-within:border-indigo-500",
          )}
        >
          <input
            type="text"
            value={field.current_state.value}
            disabled={isLocked}
            onChange={(e) => updateValue(field.field_id, e.target.value)}
            className={cn(
              "min-w-0 flex-1 bg-transparent font-mono tabular-nums outline-none",
              isLocked && "cursor-not-allowed",
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-5 shrink-0"
            aria-label={isLocked ? "Unlock field" : "Lock field"}
            onClick={(e) => {
              e.stopPropagation();
              isLocked ? unlockField(field.field_id) : lockField(field.field_id);
            }}
          >
            {isLocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
          </Button>
        </div>

        <Badge
          variant="outline"
          className={cn("h-5 w-24 shrink-0 justify-center gap-1 px-2 py-1 text-[10px] font-medium", badge.className)}
        >
          {badge.label}
        </Badge>

        <MutationPill count={mutationCount(field)} onClick={() => openLedger(field.field_id)} />
      </div>
    </div>
  );
}
