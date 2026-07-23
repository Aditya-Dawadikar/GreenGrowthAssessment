import { GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";

export function MutationPill({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-all hover:scale-105",
        count > 0
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-50 text-slate-400",
      )}
      aria-label={`View ${count} mutation event${count === 1 ? "" : "s"}`}
    >
      <GitCommit className="size-3 rotate-90" />
      <span className="font-mono tabular-nums">{count}</span>
      <span>mut.</span>
    </button>
  );
}
