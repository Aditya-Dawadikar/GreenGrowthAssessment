import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONFIDENCE_TIER_CLASSES, CONFIDENCE_TIER_DOT, confidenceTier } from "@/lib/confidence";
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
  const { selectedFieldId, selectField, updateValue, lockField, unlockField, openLedger } = useTaxReturn();

  const isSelected = selectedFieldId === field.field_id;
  const tier = confidenceTier(field.ai_ground_truth.confidence);
  const status = field.current_state.status;
  const isLocked = status === "locked";
  const badge = STATUS_BADGE[status];

  return (
    <div
      data-field-id={field.field_id}
      onClick={() => selectField(field.field_id)}
      className={cn(
        "cursor-pointer border-b border-slate-100 px-3 py-2.5 transition-colors",
        isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-600">{field.label}</span>
        <ReasoningPopover groundTruth={field.ai_ground_truth} />
        <Badge variant="outline" className={cn("ml-auto h-4 px-1.5 text-[9px] font-medium", badge.className)}>
          {badge.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs",
            CONFIDENCE_TIER_CLASSES[tier],
          )}
          title={`${Math.round(field.ai_ground_truth.confidence * 100)}% confidence`}
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", CONFIDENCE_TIER_DOT[tier])} />
          <span className="truncate font-mono tabular-nums">{field.ai_ground_truth.value}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] opacity-70">
            {Math.round(field.ai_ground_truth.confidence * 100)}%
          </span>
        </div>

        <MutationPill count={mutationCount(field)} onClick={() => openLedger(field.field_id)} />

        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 rounded-md border px-1.5 py-1 text-xs",
            isLocked
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
              : status === "user_modified"
                ? "border-blue-400 bg-blue-50/20 text-blue-950"
                : "border-slate-300 bg-white focus-within:border-indigo-500",
          )}
        >
          <input
            type="text"
            value={field.current_state.value}
            disabled={isLocked}
            onClick={(e) => e.stopPropagation()}
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
            {isLocked ? <Unlock className="size-3" /> : <Lock className="size-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
