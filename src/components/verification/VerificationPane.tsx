import { ScrollArea } from "@/components/ui/scroll-area";
import { FieldRow } from "@/components/verification/FieldRow";
import { useTaxReturn } from "@/state/tax-return-store";

export function VerificationPane() {
  const { fields, activeDocId } = useTaxReturn();
  const docFields = fields.filter((f) => f.ai_ground_truth.doc_source.doc_id === activeDocId);

  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] gap-2 border-b border-slate-200 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        <span>Ground Truth (AI, read-only)</span>
        <span className="text-center">Mutations</span>
        <span>Working State (editable)</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {docFields.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No extracted fields for this document.</p>
        ) : (
          docFields.map((field) => <FieldRow key={field.field_id} field={field} />)
        )}
      </ScrollArea>
    </div>
  );
}
