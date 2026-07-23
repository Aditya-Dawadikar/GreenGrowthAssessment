import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTimestamp } from "@/lib/format";
import type { AiGroundTruth } from "@/types/tax-return";

export function ReasoningPopover({ groundTruth }: { groundTruth: AiGroundTruth }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="AI extraction details"
          className="text-slate-400 transition-colors hover:text-indigo-600"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs" align="start">
        <dl className="space-y-2">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Model</dt>
            <dd className="font-mono font-medium text-slate-900">{groundTruth.model}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Extracted</dt>
            <dd className="text-slate-700">{formatTimestamp(groundTruth.extracted_at)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Confidence</dt>
            <dd className="font-mono font-medium text-slate-900">
              {Math.round(groundTruth.confidence * 100)}%
            </dd>
          </div>
          {groundTruth.reasoning && (
            <div className="border-t border-slate-100 pt-2">
              <dt className="mb-1 text-slate-500">OCR reasoning</dt>
              <dd className="leading-relaxed text-slate-700">{groundTruth.reasoning}</dd>
            </div>
          )}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
