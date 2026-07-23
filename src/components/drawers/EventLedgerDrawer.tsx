import { ArrowRight, GitCommit, Lock, Sparkles, Unlock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/format";
import { useTaxReturn } from "@/state/tax-return-store";
import type { FieldEvent, FieldEventType } from "@/types/tax-return";

const EVENT_ICON: Record<FieldEventType, typeof Sparkles> = {
  AI_EXTRACTED: Sparkles,
  UPDATED: GitCommit,
  LOCKED: Lock,
  UNLOCKED: Unlock,
};

const EVENT_LABEL: Record<FieldEventType, string> = {
  AI_EXTRACTED: "AI Extracted",
  UPDATED: "Updated",
  LOCKED: "Locked",
  UNLOCKED: "Unlocked",
};

const EVENT_ICON_CLASS: Record<FieldEventType, string> = {
  AI_EXTRACTED: "bg-indigo-100 text-indigo-600",
  UPDATED: "bg-blue-100 text-blue-600",
  LOCKED: "bg-emerald-100 text-emerald-600",
  UNLOCKED: "bg-amber-100 text-amber-600",
};

export function EventLedgerDrawer() {
  const { fields, ledgerFieldId, closeLedger, lockField, unlockField } = useTaxReturn();
  const field = fields.find((f) => f.field_id === ledgerFieldId) ?? null;

  const open = field !== null;
  const isLocked = field?.current_state.status === "locked";

  function parentValue(event: FieldEvent): string | number | null {
    if (!field || event.parent_id === null) return null;
    return field.event_history.find((e) => e.event_id === event.parent_id)?.value ?? null;
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeLedger()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Field Event History</SheetTitle>
          <SheetDescription>{field?.label}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {field && (
            <ol className="space-y-4">
              {[...field.event_history].reverse().map((event) => {
                const Icon = EVENT_ICON[event.type];
                const before = parentValue(event);
                return (
                  <li key={event.event_id} className="flex gap-3">
                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${EVENT_ICON_CLASS[event.type]}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {EVENT_LABEL[event.type]}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{event.user_id}</div>

                      {event.type === "UPDATED" && before !== null ? (
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-400 line-through">{before}</span>
                          <ArrowRight className="size-3 text-slate-400" />
                          <span className="font-medium text-blue-700">{event.value}</span>
                        </div>
                      ) : (
                        <div className="mt-1 font-mono text-xs text-slate-700">{event.value}</div>
                      )}

                      {event.metadata?.confidence !== undefined && (
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {Math.round(event.metadata.confidence * 100)}% confidence
                        </div>
                      )}

                      <div className="mt-0.5 font-mono text-[9px] text-slate-300">{event.event_id}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {field && (
          <SheetFooter>
            {isLocked ? (
              <Button variant="outline" onClick={() => unlockField(field.field_id)}>
                <Unlock className="size-3.5" />
                Unlock field
              </Button>
            ) : (
              <Button onClick={() => lockField(field.field_id)}>
                <Lock className="size-3.5" />
                Lock field
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
